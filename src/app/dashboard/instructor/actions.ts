"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import { escapeHtml, renderEmail, sendEmail } from "@/lib/email";
import { createNotification, createNotificationsForRecipients } from "@/lib/notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const courseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  academicTermId: z.string().uuid(),
  priceCents: z.coerce.number().min(0).default(0),
  stripePriceId: z.string().optional()
});

const sectionSchema = z.object({
  courseId: z.string().uuid(),
  name: z.string().min(1),
  instructorEmail: z.string().email(),
  capacity: z.coerce.number().int().min(1).optional()
});

const assignEnrollmentSectionSchema = z.object({
  courseId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  sectionId: z.string().uuid()
});

const moduleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2),
  position: z.coerce.number().int().min(1)
});

const lessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(2),
  lessonType: z.enum(["video", "pdf", "text", "assignment", "quiz"]),
  videoUrl: z.string().url().optional().or(z.literal("")),
  pdfPath: z.string().optional(),
  content: z.string().optional(),
  assignmentPrompt: z.string().optional(),
  dueAt: z.string().optional(),
  position: z.coerce.number().int().min(1)
});

const maxPdfBytes = 25 * 1024 * 1024;

const quizSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  title: z.string().min(2),
  passingScore: z.coerce.number().int().min(0).max(100).default(70)
});

const quizQuestionSchema = z.object({
  courseId: z.string().uuid(),
  quizId: z.string().uuid(),
  prompt: z.string().min(3),
  choices: z.string().min(3),
  correctAnswer: z.string().min(1),
  points: z.coerce.number().int().min(1).default(1),
  position: z.coerce.number().int().min(1)
});

const rubricCriterionSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  name: z.string().min(1),
  maxPoints: z.coerce.number().int().min(1),
  position: z.coerce.number().int().min(0).default(0)
});

const deleteRubricCriterionSchema = z.object({
  courseId: z.string().uuid(),
  criterionId: z.string().uuid()
});

const gradeAssignmentSchema = z.object({
  courseId: z.string().uuid(),
  submissionId: z.string().uuid(),
  studentId: z.string().uuid(),
  itemName: z.string().min(2),
  score: z.coerce.number().min(0),
  maxScore: z.coerce.number().min(1).default(100),
  feedback: z.string().optional(),
  returnTo: z.enum(["course", "gradebook"]).default("course")
});

const announcementSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2),
  body: z.string().min(2)
});

const reactivateEnrollmentSchema = z.object({
  courseId: z.string().uuid(),
  enrollmentId: z.string().uuid()
});

const deleteAnnouncementSchema = z.object({
  courseId: z.string().uuid(),
  announcementId: z.string().uuid()
});

export async function createCourseAction(formData: FormData) {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    academicTermId: formData.get("academicTermId"),
    priceCents: formData.get("priceCents") || 0,
    stripePriceId: formData.get("stripePriceId") || undefined
  });

  if (!parsed.success) {
    redirect("/dashboard/instructor/courses?error=Course details are invalid. An academic term is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      tenant_id: profile.default_tenant_id,
      title: parsed.data.title,
      slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}`,
      description: parsed.data.description,
      academic_term_id: parsed.data.academicTermId,
      price_cents: parsed.data.priceCents,
      stripe_price_id: parsed.data.stripePriceId || null,
      status: "draft",
      created_by: profile.id
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/dashboard/instructor/courses?error=${encodeURIComponent(error?.message ?? "Unable to create course.")}`);
  }

  revalidatePath("/dashboard/instructor/courses");
  redirect(`/dashboard/instructor/courses/${data.id}`);
}

export async function publishCourseAction(formData: FormData) {
  await requireProfile(["instructor", "admin"]);
  const courseId = String(formData.get("courseId"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("courses").update({ status: "published" }).eq("id", courseId);
  revalidatePath(`/dashboard/instructor/courses/${courseId}`);
}

export async function createSectionAction(formData: FormData) {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const parsed = sectionSchema.safeParse({
    courseId: formData.get("courseId"),
    name: formData.get("name"),
    instructorEmail: formData.get("instructorEmail"),
    capacity: formData.get("capacity") || undefined
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${String(formData.get("courseId"))}?error=Section details are invalid.`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: sectionInstructor } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.instructorEmail)
    .eq("default_tenant_id", profile.default_tenant_id)
    .in("role", ["instructor", "admin"])
    .maybeSingle();

  if (!sectionInstructor) {
    redirect(
      `/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(
        "No instructor with that email was found in this institution."
      )}`
    );
  }

  // RLS ("Course owners manage sections") enforces that only the course's owning instructor or
  // an admin may actually create a section — a non-owner instructor's request is rejected here.
  const { error } = await supabase.from("course_sections").insert({
    course_id: parsed.data.courseId,
    instructor_id: sectionInstructor.id,
    name: parsed.data.name,
    capacity: parsed.data.capacity ?? null
  });

  if (error) {
    redirect(`/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
}

/**
 * Moves a student's enrollment to a specific section — the manual-reassignment fast-follow noted
 * in the course-sections PR, for courses with more than one section. RLS ("Tenant instructors
 * update enrollments") enforces that only the course's owning instructor or an admin may actually
 * move a student between sections; a section instructor cannot reassign students out of/into their
 * own section.
 */
export async function assignEnrollmentSectionAction(formData: FormData) {
  await requireProfile(["instructor", "admin"]);
  const parsed = assignEnrollmentSectionSchema.safeParse({
    courseId: formData.get("courseId"),
    enrollmentId: formData.get("enrollmentId"),
    sectionId: formData.get("sectionId")
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${String(formData.get("courseId"))}?error=Unable to reassign section.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("enrollments")
    .update({ section_id: parsed.data.sectionId })
    .eq("id", parsed.data.enrollmentId)
    .eq("course_id", parsed.data.courseId);

  if (error) {
    redirect(`/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
}

export async function createModuleAction(formData: FormData) {
  await requireProfile(["instructor", "admin"]);
  const parsed = moduleSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    position: formData.get("position")
  });

  if (!parsed.success) {
    redirect("/dashboard/instructor/courses?error=Module details are invalid.");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("course_modules").insert({
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    position: parsed.data.position
  });
  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
}

export async function createLessonAction(formData: FormData) {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const courseId = String(formData.get("courseId"));
  const parsed = lessonSchema.safeParse({
    moduleId: formData.get("moduleId"),
    title: formData.get("title"),
    lessonType: formData.get("lessonType"),
    videoUrl: formData.get("videoUrl") || "",
    pdfPath: formData.get("pdfPath") || "",
    content: formData.get("content") || "",
    assignmentPrompt: formData.get("assignmentPrompt") || "",
    dueAt: formData.get("dueAt") || "",
    position: formData.get("position")
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${courseId}?error=Lesson details are invalid.`);
  }

  // `dueAt` comes from a <input type="datetime-local"> value (e.g. "2026-03-01T17:00"), which has
  // no timezone — Date() interprets it in the server's local time. Validate before calling
  // toISOString(), which throws RangeError on an invalid date rather than returning null.
  let dueAtIso: string | null = null;
  if (parsed.data.dueAt) {
    const parsedDueAt = new Date(parsed.data.dueAt);
    if (Number.isNaN(parsedDueAt.getTime())) {
      redirect(`/dashboard/instructor/courses/${courseId}?error=Due date is invalid.`);
    }
    dueAtIso = parsedDueAt.toISOString();
  }

  const supabase = await createSupabaseServerClient();
  const pdfFile = formData.get("pdfFile");
  let pdfPath = parsed.data.pdfPath || null;

  if (pdfFile instanceof File && pdfFile.size > 0) {
    const isPdf = pdfFile.type === "application/pdf" || pdfFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      redirect(`/dashboard/instructor/courses/${courseId}?error=Only PDF files can be uploaded for PDF lessons.`);
    }

    if (pdfFile.size > maxPdfBytes) {
      redirect(`/dashboard/instructor/courses/${courseId}?error=PDF files must be 25MB or smaller.`);
    }

    const safeFileName = slugify(pdfFile.name.replace(/\.pdf$/i, "")) || "lesson-file";
    const storagePath = `${profile.default_tenant_id}/${courseId}/${parsed.data.moduleId}/${Date.now().toString(36)}-${safeFileName}.pdf`;
    const { error: uploadError } = await supabase.storage.from("lesson-files").upload(storagePath, pdfFile, {
      contentType: "application/pdf",
      upsert: false
    });

    if (uploadError) {
      redirect(`/dashboard/instructor/courses/${courseId}?error=${encodeURIComponent(uploadError.message)}`);
    }

    pdfPath = storagePath;
  }

  if (parsed.data.lessonType === "pdf" && !pdfPath) {
    redirect(`/dashboard/instructor/courses/${courseId}?error=Upload a PDF file or provide a PDF storage path.`);
  }

  await supabase.from("lessons").insert({
    module_id: parsed.data.moduleId,
    title: parsed.data.title,
    lesson_type: parsed.data.lessonType,
    video_url: parsed.data.videoUrl || null,
    pdf_path: pdfPath,
    content: parsed.data.content || null,
    assignment_prompt: parsed.data.assignmentPrompt || null,
    due_at: dueAtIso,
    position: parsed.data.position
  });
  revalidatePath(`/dashboard/instructor/courses/${courseId}`);
}

export async function createQuizAction(formData: FormData) {
  await requireProfile(["instructor", "admin"]);
  const parsed = quizSchema.safeParse({
    courseId: formData.get("courseId"),
    lessonId: formData.get("lessonId"),
    title: formData.get("title"),
    passingScore: formData.get("passingScore") || 70
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${String(formData.get("courseId"))}?error=Quiz details are invalid.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("quizzes").insert({
    lesson_id: parsed.data.lessonId,
    title: parsed.data.title,
    passing_score: parsed.data.passingScore
  });

  if (error) {
    redirect(`/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
}

export async function createQuizQuestionAction(formData: FormData) {
  await requireProfile(["instructor", "admin"]);
  const parsed = quizQuestionSchema.safeParse({
    courseId: formData.get("courseId"),
    quizId: formData.get("quizId"),
    prompt: formData.get("prompt"),
    choices: formData.get("choices"),
    correctAnswer: formData.get("correctAnswer"),
    points: formData.get("points") || 1,
    position: formData.get("position")
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${String(formData.get("courseId"))}?error=Question details are invalid.`);
  }

  const choices = parsed.data.choices
    .split(/\r?\n|,/)
    .map((choice) => choice.trim())
    .filter(Boolean);

  if (choices.length < 2 || !choices.includes(parsed.data.correctAnswer.trim())) {
    redirect(
      `/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(
        "Add at least two choices and make sure the correct answer matches one choice exactly."
      )}`
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("quiz_questions").insert({
    quiz_id: parsed.data.quizId,
    prompt: parsed.data.prompt,
    choices,
    correct_answer: parsed.data.correctAnswer.trim(),
    points: parsed.data.points,
    position: parsed.data.position
  });

  if (error) {
    redirect(`/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
}

export async function addRubricCriterionAction(formData: FormData) {
  await requireProfile(["instructor", "admin"]);
  const parsed = rubricCriterionSchema.safeParse({
    courseId: formData.get("courseId"),
    lessonId: formData.get("lessonId"),
    name: formData.get("name"),
    maxPoints: formData.get("maxPoints"),
    position: formData.get("position") || 0
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${String(formData.get("courseId"))}?error=Rubric criterion details are invalid.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("assignment_rubric_criteria").insert({
    lesson_id: parsed.data.lessonId,
    name: parsed.data.name,
    max_points: parsed.data.maxPoints,
    position: parsed.data.position
  });

  if (error) {
    redirect(`/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
}

export async function deleteRubricCriterionAction(formData: FormData) {
  await requireProfile(["instructor", "admin"]);
  const parsed = deleteRubricCriterionSchema.safeParse({
    courseId: formData.get("courseId"),
    criterionId: formData.get("criterionId")
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${String(formData.get("courseId"))}?error=Unable to delete rubric criterion.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("assignment_rubric_criteria").delete().eq("id", parsed.data.criterionId);

  if (error) {
    redirect(`/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
}

export async function gradeAssignmentSubmissionAction(formData: FormData) {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const parsed = gradeAssignmentSchema.safeParse({
    courseId: formData.get("courseId"),
    submissionId: formData.get("submissionId"),
    studentId: formData.get("studentId"),
    itemName: formData.get("itemName"),
    score: formData.get("score"),
    maxScore: formData.get("maxScore") || 100,
    feedback: formData.get("feedback") || "",
    returnTo: formData.get("returnTo") || "course"
  });

  if (!parsed.success) {
    const targetPath =
      String(formData.get("returnTo")) === "gradebook"
        ? "/dashboard/instructor/gradebook"
        : `/dashboard/instructor/courses/${String(formData.get("courseId"))}`;
    redirect(`${targetPath}?error=Grade details are invalid.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error: submissionError } = await supabase
    .from("assignment_submissions")
    .update({
      status: "graded",
      grade_score: parsed.data.score,
      max_score: parsed.data.maxScore,
      feedback: parsed.data.feedback || null,
      graded_at: new Date().toISOString()
    })
    .eq("id", parsed.data.submissionId);

  if (submissionError) {
    const targetPath =
      parsed.data.returnTo === "gradebook" ? "/dashboard/instructor/gradebook" : `/dashboard/instructor/courses/${parsed.data.courseId}`;
    redirect(`${targetPath}?error=${encodeURIComponent(submissionError.message)}`);
  }

  const { error: gradeError } = await supabase.from("gradebook_entries").insert({
    course_id: parsed.data.courseId,
    student_id: parsed.data.studentId,
    item_name: parsed.data.itemName,
    score: parsed.data.score,
    max_score: parsed.data.maxScore,
    feedback: parsed.data.feedback || null
  });

  if (gradeError) {
    const targetPath =
      parsed.data.returnTo === "gradebook" ? "/dashboard/instructor/gradebook" : `/dashboard/instructor/courses/${parsed.data.courseId}`;
    redirect(`${targetPath}?error=${encodeURIComponent(gradeError.message)}`);
  }

  const [{ data: course }, { data: student }] = await Promise.all([
    supabase.from("courses").select("title").eq("id", parsed.data.courseId).maybeSingle(),
    supabase.from("profiles").select("email,full_name").eq("id", parsed.data.studentId).maybeSingle()
  ]);

  if (student?.email) {
    const courseTitle = escapeHtml(course?.title ?? "your course");
    await sendEmail({
      to: student.email,
      subject: `New grade posted${course?.title ? `: ${course.title}` : ""}`,
      html: renderEmail({
        heading: "New grade posted",
        body: `<p>Hi ${escapeHtml(student.full_name ?? "there")},</p><p><strong>${escapeHtml(
          parsed.data.itemName
        )}</strong> in ${courseTitle} has been graded: ${parsed.data.score}/${parsed.data.maxScore}.${
          parsed.data.feedback ? ` Feedback: ${escapeHtml(parsed.data.feedback)}` : ""
        }</p>`
      })
    });
  }

  await createNotification(supabase, {
    tenantId: profile.default_tenant_id,
    recipientId: parsed.data.studentId,
    type: "grade",
    title: `New grade posted: ${parsed.data.itemName}`,
    body: `${parsed.data.score}/${parsed.data.maxScore}${course?.title ? ` in ${course.title}` : ""}`,
    link: `/dashboard/student/courses/${parsed.data.courseId}`
  });

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
  revalidatePath("/dashboard/instructor/gradebook");
  if (parsed.data.returnTo === "gradebook") {
    redirect("/dashboard/instructor/gradebook");
  }
}

export async function createAnnouncementAction(formData: FormData) {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const parsed = announcementSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    body: formData.get("body")
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${String(formData.get("courseId"))}?error=Announcement details are invalid.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("course_announcements").insert({
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    body: parsed.data.body,
    created_by: profile.id
  });

  if (error) {
    redirect(`/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(error.message)}`);
  }

  const { data: enrolledStudents } = await supabase.from("enrollments").select("student_id").eq("course_id", parsed.data.courseId);
  await createNotificationsForRecipients(supabase, {
    tenantId: profile.default_tenant_id,
    recipientIds: (enrolledStudents ?? []).map((enrollment) => enrollment.student_id),
    type: "announcement",
    title: parsed.data.title,
    body: parsed.data.body,
    link: `/dashboard/student/courses/${parsed.data.courseId}`
  });

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
  revalidatePath(`/dashboard/student/courses/${parsed.data.courseId}`);
}

export async function reactivateEnrollmentAction(formData: FormData) {
  // Admin-only: reversing an automatic inactivity withdrawal is a judgment call about whether the
  // student had a valid reason (illness, etc.), not something an instructor should do unilaterally.
  await requireProfile(["admin"]);
  const parsed = reactivateEnrollmentSchema.safeParse({
    courseId: formData.get("courseId"),
    enrollmentId: formData.get("enrollmentId")
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${String(formData.get("courseId"))}?error=Unable to reactivate enrollment.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("enrollments")
    .update({
      status: "active",
      dropped_automatically: false,
      last_activity_at: new Date().toISOString(),
      inactivity_alert_sent_at: null
    })
    .eq("id", parsed.data.enrollmentId)
    .eq("dropped_automatically", true);

  if (error) {
    redirect(`/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
}

export async function deleteAnnouncementAction(formData: FormData) {
  await requireProfile(["instructor", "admin"]);
  const parsed = deleteAnnouncementSchema.safeParse({
    courseId: formData.get("courseId"),
    announcementId: formData.get("announcementId")
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${String(formData.get("courseId"))}?error=Unable to delete announcement.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("course_announcements").delete().eq("id", parsed.data.announcementId);

  if (error) {
    redirect(`/dashboard/instructor/courses/${parsed.data.courseId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
  revalidatePath(`/dashboard/student/courses/${parsed.data.courseId}`);
}
