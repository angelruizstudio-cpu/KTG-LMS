"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const courseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  priceCents: z.coerce.number().min(0).default(0),
  stripePriceId: z.string().optional()
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
  position: z.coerce.number().int().min(1)
});

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

export async function createCourseAction(formData: FormData) {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priceCents: formData.get("priceCents") || 0,
    stripePriceId: formData.get("stripePriceId") || undefined
  });

  if (!parsed.success) {
    redirect("/dashboard/instructor/courses?error=Course details are invalid.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      tenant_id: profile.default_tenant_id,
      title: parsed.data.title,
      slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}`,
      description: parsed.data.description,
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
  await requireProfile(["instructor", "admin"]);
  const courseId = String(formData.get("courseId"));
  const parsed = lessonSchema.safeParse({
    moduleId: formData.get("moduleId"),
    title: formData.get("title"),
    lessonType: formData.get("lessonType"),
    videoUrl: formData.get("videoUrl") || "",
    pdfPath: formData.get("pdfPath") || "",
    content: formData.get("content") || "",
    assignmentPrompt: formData.get("assignmentPrompt") || "",
    position: formData.get("position")
  });

  if (!parsed.success) {
    redirect(`/dashboard/instructor/courses/${courseId}?error=Lesson details are invalid.`);
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("lessons").insert({
    module_id: parsed.data.moduleId,
    title: parsed.data.title,
    lesson_type: parsed.data.lessonType,
    video_url: parsed.data.videoUrl || null,
    pdf_path: parsed.data.pdfPath || null,
    content: parsed.data.content || null,
    assignment_prompt: parsed.data.assignmentPrompt || null,
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

export async function gradeAssignmentSubmissionAction(formData: FormData) {
  await requireProfile(["instructor", "admin"]);
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

  revalidatePath(`/dashboard/instructor/courses/${parsed.data.courseId}`);
  revalidatePath("/dashboard/instructor/gradebook");
  if (parsed.data.returnTo === "gradebook") {
    redirect("/dashboard/instructor/gradebook");
  }
}
