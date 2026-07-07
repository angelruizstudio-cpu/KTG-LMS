"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { escapeHtml, renderEmail, sendEmail } from "@/lib/email";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Mark a student as active in a course "just now", for the Phase 3 inactivity job (15-day alert /
 * 20-day auto-drop). Clears a previously-sent alert so a student who resumes work stops being
 * flagged. Uses the service role because students can no longer update their own enrollments row
 * directly (see security finding H2).
 */
async function touchEnrollmentActivity(admin: ReturnType<typeof createSupabaseAdminClient>, courseId: string, studentId: string) {
  await admin
    .from("enrollments")
    .update({ last_activity_at: new Date().toISOString(), inactivity_alert_sent_at: null })
    .eq("course_id", courseId)
    .eq("student_id", studentId);
}

export async function submitAssignmentAction(formData: FormData) {
  const { profile } = await requireProfile(["student", "admin"]);
  const courseId = String(formData.get("courseId"));
  const lessonId = String(formData.get("lessonId"));
  const submissionText = String(formData.get("submissionText") ?? "").trim();
  const filePath = String(formData.get("filePath") ?? "").trim();

  if (!submissionText) {
    redirect(`/dashboard/student/courses/${courseId}?error=Assignment submission cannot be empty.`);
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("assignment_submissions").upsert(
    {
      lesson_id: lessonId,
      student_id: profile.id,
      submission_text: submissionText,
      file_path: filePath || null,
      status: "submitted"
    },
    { onConflict: "lesson_id,student_id" }
  );

  await touchEnrollmentActivity(createSupabaseAdminClient(), courseId, profile.id);

  revalidatePath(`/dashboard/student/courses/${courseId}`);
}

export async function enrollInCourseAction(formData: FormData) {
  await requireProfile(["student", "admin"]);
  const courseId = String(formData.get("courseId"));
  redirect(
    `/dashboard/student/catalog?error=${encodeURIComponent(
      `Course access is assigned by the academic team. Course ${courseId} has not been opened for you yet.`
    )}`
  );
}

export async function markLessonCompleteAction(formData: FormData) {
  const { profile } = await requireProfile(["student", "admin"]);
  const courseId = String(formData.get("courseId"));
  const lessonId = String(formData.get("lessonId"));
  const supabase = await createSupabaseServerClient();

  await supabase.from("lesson_progress").upsert(
    {
      lesson_id: lessonId,
      student_id: profile.id,
      completed: true,
      completed_at: new Date().toISOString()
    },
    { onConflict: "lesson_id,student_id" }
  );

  const { data: modules } = await supabase.from("course_modules").select("id").eq("course_id", courseId);
  const moduleIds = modules?.map((module) => module.id) ?? [];
  const { count: lessonCount } =
    moduleIds.length > 0
      ? await supabase.from("lessons").select("*", { count: "exact", head: true }).in("module_id", moduleIds)
      : { count: 0 };
  const { count: completedCount } = await supabase
    .from("lesson_progress")
    .select("*", { count: "exact", head: true })
    .eq("student_id", profile.id)
    .eq("completed", true)
    .in("lesson_id", lessonCount ? (await supabase.from("lessons").select("id").in("module_id", moduleIds)).data?.map((l) => l.id) ?? [] : []);

  const progressPercent = lessonCount ? Math.round(((completedCount ?? 0) / lessonCount) * 100) : 0;
  const completed = progressPercent >= 100;

  // Completion/progress is authoritative state that gates certificates, so it is written with the
  // service role rather than a student-writable RLS path (see security finding H2).
  const admin = createSupabaseAdminClient();
  await admin
    .from("enrollments")
    .update({
      progress_percent: progressPercent,
      status: completed ? "completed" : "active",
      completed_at: completed ? new Date().toISOString() : null,
      last_activity_at: new Date().toISOString(),
      inactivity_alert_sent_at: null
    })
    .eq("course_id", courseId)
    .eq("student_id", profile.id);

  if (completed) {
    await issueEligibleProgramCertificates(profile.id);
  }

  revalidatePath(`/dashboard/student/courses/${courseId}`);
  revalidatePath(`/dashboard/student/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath("/dashboard/student/certificates");
}

export async function submitQuizAction(formData: FormData) {
  const { profile } = await requireProfile(["student", "admin"]);
  const quizId = String(formData.get("quizId"));
  // Correct answers, attempts and grades are handled with the service role so that
  // quiz_questions.correct_answer is never read through a client-reachable path and so that
  // students cannot forge their own attempts/grades (see security findings H1/H2).
  const admin = createSupabaseAdminClient();

  const { data: quiz } = await admin.from("quizzes").select("*").eq("id", quizId).single();
  const { data: questions } = await admin.from("quiz_questions").select("*").eq("quiz_id", quizId);

  if (!quiz || !questions || questions.length === 0) {
    redirect(`/dashboard/student/catalog?error=Quiz not found.`);
  }

  // Derive the owning course from the quiz itself (never trust a client-supplied courseId).
  const { data: lesson } = await admin.from("lessons").select("module_id").eq("id", quiz.lesson_id).single();
  const { data: courseModule } = lesson
    ? await admin.from("course_modules").select("course_id").eq("id", lesson.module_id).single()
    : { data: null };
  const courseId = courseModule?.course_id;

  if (!courseId) {
    redirect(`/dashboard/student/catalog?error=Quiz not found.`);
  }

  // Verify the caller is actually enrolled in that course.
  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (!enrollment && profile.role !== "admin") {
    redirect(`/dashboard/student/catalog?error=${encodeURIComponent("You do not have access to this course.")}`);
  }

  const answers = Object.fromEntries(questions.map((question) => [question.id, String(formData.get(question.id) ?? "")]));
  const maxScore = questions.reduce((sum, question) => sum + question.points, 0);
  const score = questions.reduce((sum, question) => {
    return answers[question.id] === question.correct_answer ? sum + question.points : sum;
  }, 0);
  const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;

  await admin.from("quiz_attempts").insert({
    quiz_id: quizId,
    student_id: profile.id,
    answers,
    score: percent,
    passed: percent >= quiz.passing_score
  });

  await admin.from("gradebook_entries").insert({
    course_id: courseId,
    student_id: profile.id,
    item_name: quiz.title,
    score: percent,
    max_score: 100,
    feedback: percent >= quiz.passing_score ? "Passed" : "Review the lesson and try again."
  });

  await touchEnrollmentActivity(admin, courseId, profile.id);

  revalidatePath(`/dashboard/student/courses/${courseId}`);
}

async function issueEligibleProgramCertificates(studentId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: programEnrollments } = await supabase
    .from("program_enrollments")
    .select("program_id")
    .eq("student_id", studentId)
    .eq("status", "active");

  for (const programEnrollment of programEnrollments ?? []) {
    const programId = programEnrollment.program_id;
    const [{ data: programCourses }, { data: financeClearance }, { data: existingCertificate }] = await Promise.all([
      supabase.from("program_courses").select("course_id,required").eq("program_id", programId).eq("required", true),
      supabase
        .from("finance_clearances")
        .select("status")
        .eq("program_id", programId)
        .eq("student_id", studentId)
        .maybeSingle(),
      supabase
        .from("program_certificates")
        .select("id")
        .eq("program_id", programId)
        .eq("student_id", studentId)
        .maybeSingle()
    ]);

    if (existingCertificate || financeClearance?.status !== "cleared") {
      continue;
    }

    const requiredCourseIds = (programCourses ?? []).map((course) => course.course_id);
    if (!requiredCourseIds.length) {
      continue;
    }

    const { data: completedEnrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_id", studentId)
      .eq("status", "completed")
      .in("course_id", requiredCourseIds);

    const completedCourseIds = new Set((completedEnrollments ?? []).map((enrollment) => enrollment.course_id));
    const completedAllRequiredCourses = requiredCourseIds.every((courseId) => completedCourseIds.has(courseId));

    if (completedAllRequiredCourses) {
      const { error: certificateError } = await supabase.from("program_certificates").upsert(
        {
          program_id: programId,
          student_id: studentId,
          certificate_number: `PROG-${programId.slice(0, 8).toUpperCase()}-${studentId.slice(0, 8).toUpperCase()}`
        },
        { onConflict: "program_id,student_id" }
      );

      if (!certificateError) {
        const [{ data: program }, { data: student }] = await Promise.all([
          supabase.from("programs").select("name").eq("id", programId).maybeSingle(),
          supabase.from("profiles").select("email,full_name").eq("id", studentId).maybeSingle()
        ]);

        if (student?.email) {
          const programName = escapeHtml(program?.name ?? "your program");
          await sendEmail({
            to: student.email,
            subject: `Certificate issued: ${program?.name ?? "your program"}`,
            html: renderEmail({
              heading: "Certificate issued",
              body: `<p>Congratulations ${escapeHtml(
                student.full_name ?? ""
              )}! Your certificate for <strong>${programName}</strong> has been issued. You can view and print it from your student dashboard.</p>`
            })
          });
        }
      }
    }
  }
}
