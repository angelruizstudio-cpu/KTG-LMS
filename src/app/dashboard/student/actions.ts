"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

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

  await supabase
    .from("enrollments")
    .update({
      progress_percent: progressPercent,
      status: completed ? "completed" : "active",
      completed_at: completed ? new Date().toISOString() : null
    })
    .eq("course_id", courseId)
    .eq("student_id", profile.id);

  if (completed) {
    await issueEligibleProgramCertificates(profile.id);
  }

  revalidatePath(`/dashboard/student/courses/${courseId}`);
  revalidatePath("/dashboard/student/certificates");
}

export async function submitQuizAction(formData: FormData) {
  const { profile } = await requireProfile(["student", "admin"]);
  const quizId = String(formData.get("quizId"));
  const courseId = String(formData.get("courseId"));
  const supabase = await createSupabaseServerClient();
  const { data: quiz } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
  const { data: questions } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId);

  if (!quiz || !questions) {
    redirect(`/dashboard/student/courses/${courseId}?error=Quiz not found.`);
  }

  const answers = Object.fromEntries(questions.map((question) => [question.id, String(formData.get(question.id) ?? "")]));
  const maxScore = questions.reduce((sum, question) => sum + question.points, 0);
  const score = questions.reduce((sum, question) => {
    return answers[question.id] === question.correct_answer ? sum + question.points : sum;
  }, 0);
  const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;

  await supabase.from("quiz_attempts").insert({
    quiz_id: quizId,
    student_id: profile.id,
    answers,
    score: percent,
    passed: percent >= quiz.passing_score
  });

  await supabase.from("gradebook_entries").insert({
    course_id: courseId,
    student_id: profile.id,
    item_name: quiz.title,
    score: percent,
    max_score: 100,
    feedback: percent >= quiz.passing_score ? "Passed" : "Review the lesson and try again."
  });

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
      await supabase.from("program_certificates").upsert(
        {
          program_id: programId,
          student_id: studentId,
          certificate_number: `PROG-${programId.slice(0, 8).toUpperCase()}-${studentId.slice(0, 8).toUpperCase()}`
        },
        { onConflict: "program_id,student_id" }
      );
    }
  }
}
