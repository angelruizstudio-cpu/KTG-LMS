import { CheckCircle2, FileText, PlayCircle, Trophy, UploadCloud } from "lucide-react";
import Link from "next/link";

import { markLessonCompleteAction, submitAssignmentAction, submitQuizAction } from "@/app/dashboard/student/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
type AssignmentSubmissionRow = Database["public"]["Tables"]["assignment_submissions"]["Row"];

export default async function StudentCoursePage({
  params
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { profile } = await requireProfile(["student", "admin"]);
  const { courseId } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: course }, { data: enrollment }, { data: modules }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).single(),
    supabase.from("enrollments").select("*").eq("course_id", courseId).eq("student_id", profile.id).maybeSingle(),
    supabase.from("course_modules").select("*").eq("course_id", courseId).order("position")
  ]);

  if (!course || !enrollment) {
    return (
      <Card>
        <CardContent className="grid gap-4 text-center">
          <h1 className="text-xl font-bold text-text-primary">Enrollment required</h1>
          <p className="text-sm text-text-secondary">An administrator must grant access before you can view lessons.</p>
          <Link className="font-semibold text-primary-hover" href="/dashboard/student/catalog">
            View program courses
          </Link>
        </CardContent>
      </Card>
    );
  }

  const moduleIds = modules?.map((module) => module.id) ?? [];
  const [{ data: lessons }, { data: progress }, { data: quizzes }, { data: questions }, { data: submissions }] = await Promise.all([
    moduleIds.length
      ? supabase.from("lessons").select("*").in("module_id", moduleIds).order("position")
      : Promise.resolve({ data: [] as LessonRow[] }),
    supabase.from("lesson_progress").select("*").eq("student_id", profile.id),
    supabase.from("quizzes").select("*"),
    supabase.from("quiz_questions").select("*").order("position"),
    supabase.from("assignment_submissions").select("*").eq("student_id", profile.id)
  ]);

  const completedIds = new Set((progress ?? []).filter((item) => item.completed).map((item) => item.lesson_id));
  const pdfPaths = (lessons ?? []).map((lesson) => lesson.pdf_path).filter((path): path is string => Boolean(path));
  const signedPdfEntries = await Promise.all(
    pdfPaths.map(async (path) => {
      const { data } = await supabase.storage.from("lesson-files").createSignedUrl(path, 60 * 60);
      return [path, data?.signedUrl ?? null] as const;
    })
  );
  const signedPdfUrls = new Map(signedPdfEntries.filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
  const lessonsByModule = (lessons ?? []).reduce<Record<string, LessonRow[]>>((acc, lesson) => {
    acc[lesson.module_id] = [...(acc[lesson.module_id] ?? []), lesson];
    return acc;
  }, {});
  const quizByLesson = new Map((quizzes ?? []).map((quiz) => [quiz.lesson_id, quiz]));
  const submissionByLesson = new Map(((submissions ?? []) as AssignmentSubmissionRow[]).map((submission) => [submission.lesson_id, submission]));

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <Badge tone={enrollment.status === "completed" ? "green" : "blue"}>{enrollment.status}</Badge>
            <span className="text-sm font-semibold text-text-secondary">{enrollment.progress_percent}% complete</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">{course.title}</h1>
          <p className="mt-2 max-w-3xl text-text-secondary">{course.description}</p>
        </div>
        {enrollment.status === "completed" ? (
          <Link className="inline-flex items-center gap-2 font-semibold text-primary-hover" href="/dashboard/student/certificates">
            <Trophy size={18} />
            View certificate
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4">
        {(modules ?? []).map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">
                {module.position}. {module.title}
              </h2>
            </CardHeader>
            <CardContent className="grid gap-4">
              {(lessonsByModule[module.id] ?? []).map((lesson) => {
                const quiz = quizByLesson.get(lesson.id);
                return (
                  <div key={lesson.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="flex gap-3">
                        {lesson.lesson_type === "video" ? (
                          <PlayCircle className="mt-1 text-secondary" size={20} />
                        ) : lesson.lesson_type === "pdf" ? (
                          <UploadCloud className="mt-1 text-secondary" size={20} />
                        ) : (
                          <FileText className="mt-1 text-secondary" size={20} />
                        )}
                        <div>
                          <Link
                            className="font-semibold text-text-primary transition hover:text-primary-hover"
                            href={`/dashboard/student/courses/${course.id}/lessons/${lesson.id}`}
                          >
                            {lesson.title}
                          </Link>
                          <p className="mt-1 text-xs capitalize text-text-secondary">{lesson.lesson_type}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-text-inverse shadow-glow transition hover:bg-primary-hover"
                          href={`/dashboard/student/courses/${course.id}/lessons/${lesson.id}`}
                        >
                          Open lesson
                        </Link>
                        <form action={markLessonCompleteAction}>
                          <input name="courseId" type="hidden" value={course.id} />
                          <input name="lessonId" type="hidden" value={lesson.id} />
                          <Button disabled={completedIds.has(lesson.id)} size="sm" type="submit" variant="secondary">
                            {completedIds.has(lesson.id) ? (
                              <>
                                <CheckCircle2 size={16} />
                                Complete
                              </>
                            ) : (
                              "Mark complete"
                            )}
                          </Button>
                        </form>
                      </div>
                    </div>
                    {lesson.video_url ? (
                      <a className="mt-4 block text-sm font-semibold text-primary-hover" href={lesson.video_url} rel="noreferrer" target="_blank">
                        Open video
                      </a>
                    ) : null}
                    {lesson.pdf_path ? (
                      signedPdfUrls.get(lesson.pdf_path) ? (
                        <a
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-secondary-light px-4 py-2 text-sm font-semibold text-secondary-hover transition hover:bg-primary-light hover:text-primary-hover"
                          href={signedPdfUrls.get(lesson.pdf_path)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <UploadCloud size={16} />
                          Open PDF
                        </a>
                      ) : (
                        <p className="mt-4 text-sm text-text-secondary">PDF file is temporarily unavailable.</p>
                      )
                    ) : null}
                    {lesson.content ? <p className="mt-4 whitespace-pre-line text-sm leading-6 text-text-secondary">{lesson.content}</p> : null}
                    {lesson.assignment_prompt ? (
                      <div className="mt-4 rounded-xl bg-background p-3 text-sm text-text-secondary">
                        <p className="font-semibold text-text-primary">Assignment</p>
                        <p className="mt-1">{lesson.assignment_prompt}</p>
                      </div>
                    ) : null}
                    {lesson.lesson_type === "assignment" ? (
                      <form action={submitAssignmentAction} className="mt-4 grid gap-3 rounded-xl bg-background p-3">
                        <input name="courseId" type="hidden" value={course.id} />
                        <input name="lessonId" type="hidden" value={lesson.id} />
                        <Textarea
                          defaultValue={submissionByLesson.get(lesson.id)?.submission_text ?? ""}
                          label={submissionByLesson.has(lesson.id) ? "Update submission" : "Submission"}
                          name="submissionText"
                          required
                        />
                        <Input
                          defaultValue={submissionByLesson.get(lesson.id)?.file_path ?? ""}
                          label="Optional file path"
                          name="filePath"
                          placeholder="lesson-files/submissions/my-work.pdf"
                        />
                        {submissionByLesson.has(lesson.id) ? (
                          <div className="rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary">
                            <p className="font-semibold capitalize text-text-primary">
                              Status: {submissionByLesson.get(lesson.id)?.status}
                            </p>
                            {submissionByLesson.get(lesson.id)?.grade_score !== null ? (
                              <p className="mt-1">
                                Grade: {submissionByLesson.get(lesson.id)?.grade_score}/{submissionByLesson.get(lesson.id)?.max_score}
                              </p>
                            ) : null}
                            {submissionByLesson.get(lesson.id)?.feedback ? (
                              <p className="mt-1">Feedback: {submissionByLesson.get(lesson.id)?.feedback}</p>
                            ) : null}
                          </div>
                        ) : null}
                        <Button className="w-fit" size="sm" type="submit">
                          {submissionByLesson.has(lesson.id) ? "Update assignment" : "Submit assignment"}
                        </Button>
                      </form>
                    ) : null}
                    {quiz ? (
                      <form action={submitQuizAction} className="mt-4 grid gap-3 rounded-xl bg-background p-3">
                        <input name="quizId" type="hidden" value={quiz.id} />
                        <input name="courseId" type="hidden" value={course.id} />
                        <p className="font-semibold text-text-primary">{quiz.title}</p>
                        {(questions ?? [])
                          .filter((question) => question.quiz_id === quiz.id)
                          .map((question) => (
                            <label key={question.id} className="grid gap-2 text-sm font-medium text-text-secondary">
                              {question.prompt}
                              <select className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary" name={question.id}>
                                {(Array.isArray(question.choices) ? question.choices : []).map((choice: unknown) => (
                                  <option key={String(choice)} value={String(choice)}>
                                    {String(choice)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                        <Button className="w-fit" size="sm" type="submit">
                          Submit quiz
                        </Button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
