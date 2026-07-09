import { Megaphone, FileQuestion, FileText, PlayCircle, Trash2, UploadCloud, UsersRound } from "lucide-react";

import {
  createAnnouncementAction,
  createLessonAction,
  createModuleAction,
  createQuizAction,
  createQuizQuestionAction,
  createSectionAction,
  deleteAnnouncementAction,
  gradeAssignmentSubmissionAction,
  publishCourseAction,
  reactivateEnrollmentAction
} from "@/app/dashboard/instructor/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmSubmitButton, SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import type { Database } from "@/types/database";

type ModuleRow = Database["public"]["Tables"]["course_modules"]["Row"];
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type QuestionRow = Database["public"]["Tables"]["quiz_questions"]["Row"];
type AssignmentSubmissionWithProfile = Database["public"]["Tables"]["assignment_submissions"]["Row"] & {
  profiles?: { full_name?: string | null; email?: string | null } | null;
};
type EnrollmentWithProfile = {
  id: string;
  status: string;
  progress_percent: number;
  last_activity_at: string;
  dropped_automatically: boolean;
  section_id: string | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};
type AnnouncementRow = Database["public"]["Tables"]["course_announcements"]["Row"];
type SectionWithInstructor = Database["public"]["Tables"]["course_sections"]["Row"] & {
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

const AT_RISK_DAYS = 10;

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

export default async function InstructorCourseDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const { courseId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [{ data: course }, { data: modules }, { data: enrollments }, { data: announcements }, { data: sections }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).single(),
    supabase.from("course_modules").select("*").eq("course_id", courseId).order("position"),
    supabase.from("enrollments").select("*, profiles:student_id(full_name,email)").eq("course_id", courseId),
    supabase.from("course_announcements").select("*").eq("course_id", courseId).order("created_at", { ascending: false }),
    supabase.from("course_sections").select("*, profiles:instructor_id(full_name,email)").eq("course_id", courseId).order("name")
  ]);

  if (!course) {
    return <div className="text-sm text-text-secondary">Course not found.</div>;
  }

  // Content (modules/lessons/quizzes/announcements) is shared across every section of a course and
  // stays managed by the course's owning instructor (or an admin) — a section instructor manages
  // their own section's roster/grades, but not the shared content. See migration 019.
  const isOwner = course.created_by === profile.id || profile.role === "admin";

  const moduleIds = (modules ?? []).map((module) => module.id);
  const { data: lessons } = moduleIds.length
    ? await supabase.from("lessons").select("*").in("module_id", moduleIds).order("position")
    : { data: [] as LessonRow[] };
  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
  const { data: quizzes } = lessonIds.length
    ? await supabase.from("quizzes").select("*").in("lesson_id", lessonIds)
    : { data: [] as QuizRow[] };
  const quizIds = (quizzes ?? []).map((quiz) => quiz.id);
  // correct_answer is not readable by the authenticated role (see security finding H1); read the
  // full question rows with the service role, scoped to this course's quizzes (authorized above).
  const admin = createSupabaseAdminClient();
  const { data: questions } = quizIds.length
    ? await admin.from("quiz_questions").select("*").in("quiz_id", quizIds).order("position")
    : { data: [] as QuestionRow[] };
  const { data: assignmentSubmissions } = lessonIds.length
    ? await supabase
        .from("assignment_submissions")
        .select("*, profiles:student_id(full_name,email)")
        .in("lesson_id", lessonIds)
        .order("submitted_at", { ascending: false })
    : { data: [] as AssignmentSubmissionWithProfile[] };

  const lessonsByModule = (lessons ?? []).reduce<Record<string, LessonRow[]>>((acc, lesson) => {
    acc[lesson.module_id] = [...(acc[lesson.module_id] ?? []), lesson];
    return acc;
  }, {});
  const quizByLesson = new Map((quizzes ?? []).map((quiz) => [quiz.lesson_id, quiz as QuizRow]));
  const questionsByQuiz = (questions ?? []).reduce<Record<string, QuestionRow[]>>((acc, question) => {
    acc[question.quiz_id] = [...(acc[question.quiz_id] ?? []), question as QuestionRow];
    return acc;
  }, {});
  const submissionsByLesson = ((assignmentSubmissions ?? []) as AssignmentSubmissionWithProfile[]).reduce<
    Record<string, AssignmentSubmissionWithProfile[]>
  >((acc, submission) => {
    acc[submission.lesson_id] = [...(acc[submission.lesson_id] ?? []), submission];
    return acc;
  }, {});

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <Badge tone={course.status === "published" ? "green" : "amber"}>{course.status}</Badge>
            <span className="text-sm text-text-secondary">{enrollments?.length ?? 0} enrolled</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">{course.title}</h1>
          <p className="mt-2 max-w-3xl text-text-secondary">{course.description}</p>
        </div>
        {isOwner ? (
          <form action={publishCourseAction}>
            <input name="courseId" type="hidden" value={course.id} />
            <Button disabled={course.status === "published"} type="submit">
              Publish course
            </Button>
          </form>
        ) : null}
      </div>
      {query.error ? (
        <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">{query.error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          {(modules ?? []).map((module: ModuleRow) => (
            <Card key={module.id}>
              <CardHeader>
                <h2 className="font-semibold text-text-primary">
                  {module.position}. {module.title}
                </h2>
              </CardHeader>
              <CardContent className="grid gap-3">
                {(lessonsByModule[module.id] ?? []).map((lesson) => {
                  const quiz = quizByLesson.get(lesson.id);
                  const quizQuestions = quiz ? questionsByQuiz[quiz.id] ?? [] : [];
                  const submissions = submissionsByLesson[lesson.id] ?? [];

                  return (
                    <div key={lesson.id} className="grid gap-4 rounded-xl border border-border p-3">
                      <div className="flex items-start gap-3">
                        {lesson.lesson_type === "video" ? (
                          <PlayCircle className="mt-0.5 text-secondary" size={18} />
                        ) : lesson.lesson_type === "pdf" ? (
                          <UploadCloud className="mt-0.5 text-secondary" size={18} />
                        ) : lesson.lesson_type === "quiz" ? (
                          <FileQuestion className="mt-0.5 text-secondary" size={18} />
                        ) : (
                          <FileText className="mt-0.5 text-secondary" size={18} />
                        )}
                        <div>
                          <p className="font-semibold text-text-primary">{lesson.title}</p>
                          <p className="text-xs capitalize text-text-secondary">{lesson.lesson_type}</p>
                        </div>
                      </div>

                      {lesson.lesson_type === "quiz" && !quiz && isOwner ? (
                        <form action={createQuizAction} className="grid gap-3 rounded-2xl bg-background p-3">
                          <input name="courseId" type="hidden" value={course.id} />
                          <input name="lessonId" type="hidden" value={lesson.id} />
                          <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
                            <Input label="Quiz title" name="title" defaultValue={`${lesson.title} Quiz`} required />
                            <Input label="Passing score" name="passingScore" type="number" min={0} max={100} defaultValue={70} />
                            <Button size="sm" type="submit">
                              Create quiz
                            </Button>
                          </div>
                        </form>
                      ) : null}

                      {quiz ? (
                        <div className="grid gap-3 rounded-2xl bg-background p-3">
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div>
                              <p className="font-semibold text-text-primary">{quiz.title}</p>
                              <p className="text-xs text-text-secondary">Passing score: {quiz.passing_score}%</p>
                            </div>
                            <Badge tone="pink">{quizQuestions.length} questions</Badge>
                          </div>

                          {quizQuestions.length ? (
                            <div className="grid gap-2">
                              {quizQuestions.map((question) => (
                                <div key={question.id} className="rounded-xl border border-border bg-surface p-3">
                                  <p className="text-sm font-semibold text-text-primary">
                                    {question.position}. {question.prompt}
                                  </p>
                                  <p className="mt-1 text-xs text-text-secondary">
                                    Answer: {question.correct_answer} · {question.points} point{question.points === 1 ? "" : "s"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-text-secondary">No questions yet. Add the first one below.</p>
                          )}

                          {isOwner ? (
                            <form action={createQuizQuestionAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-3">
                              <input name="courseId" type="hidden" value={course.id} />
                              <input name="quizId" type="hidden" value={quiz.id} />
                              <Input label="Question prompt" name="prompt" required />
                              <Textarea label="Choices" name="choices" placeholder={"One choice per line\nOption A\nOption B"} required />
                              <div className="grid gap-3 md:grid-cols-[1fr_120px_120px_auto] md:items-end">
                                <Input label="Correct answer" name="correctAnswer" required />
                                <Input label="Points" name="points" type="number" min={1} defaultValue={1} />
                                <Input label="Position" name="position" type="number" min={1} defaultValue={quizQuestions.length + 1} />
                                <Button size="sm" type="submit">
                                  Add question
                                </Button>
                              </div>
                            </form>
                          ) : null}
                        </div>
                      ) : null}

                      {lesson.lesson_type === "assignment" ? (
                        <div className="grid gap-3 rounded-2xl bg-background p-3">
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div>
                              <p className="font-semibold text-text-primary">Assignment submissions</p>
                              <p className="text-xs text-text-secondary">{submissions.length} submitted</p>
                            </div>
                            <Badge tone={submissions.length ? "blue" : "slate"}>{submissions.length} submissions</Badge>
                          </div>

                          {submissions.length ? (
                            <div className="grid gap-3">
                              {submissions.map((submission) => (
                                <div key={submission.id} className="grid gap-3 rounded-2xl border border-border bg-surface p-3">
                                  <div>
                                    <p className="font-semibold text-text-primary">
                                      {submission.profiles?.full_name ?? "Student"}
                                    </p>
                                    <p className="text-xs text-text-secondary">{submission.profiles?.email}</p>
                                    <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{submission.submission_text}</p>
                                    {submission.file_path ? (
                                      <p className="mt-2 text-xs font-semibold text-primary-hover">{submission.file_path}</p>
                                    ) : null}
                                  </div>

                                  <form
                                    action={gradeAssignmentSubmissionAction}
                                    className="grid gap-3 md:grid-cols-[1fr_110px_110px_1fr_auto] md:items-end"
                                  >
                                    <input name="courseId" type="hidden" value={course.id} />
                                    <input name="submissionId" type="hidden" value={submission.id} />
                                    <input name="studentId" type="hidden" value={submission.student_id} />
                                    <input name="itemName" type="hidden" value={`Assignment: ${lesson.title}`} />
                                    <Input
                                      defaultValue={submission.feedback ?? ""}
                                      label="Feedback"
                                      name="feedback"
                                      placeholder="Great work..."
                                    />
                                    <Input
                                      defaultValue={submission.grade_score ?? ""}
                                      label="Score"
                                      name="score"
                                      type="number"
                                      min={0}
                                      required
                                    />
                                    <Input
                                      defaultValue={submission.max_score}
                                      label="Max"
                                      name="maxScore"
                                      type="number"
                                      min={1}
                                      required
                                    />
                                    <Badge tone={submission.status === "graded" ? "green" : "amber"}>{submission.status}</Badge>
                                    <Button size="sm" type="submit">
                                      Save grade
                                    </Button>
                                  </form>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-text-secondary">No assignment submissions yet.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {isOwner ? (
                  <form action={createLessonAction} className="grid gap-3 rounded-2xl bg-background p-3" encType="multipart/form-data">
                    <input name="courseId" type="hidden" value={course.id} />
                    <input name="moduleId" type="hidden" value={module.id} />
                    <Input label="Lesson title" name="title" required />
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-text-secondary">
                        Type
                        <select className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary" name="lessonType">
                          <option value="text">Text</option>
                          <option value="video">Video link</option>
                          <option value="pdf">PDF file path</option>
                          <option value="assignment">Assignment</option>
                          <option value="quiz">Quiz</option>
                        </select>
                      </label>
                      <Input label="Position" name="position" type="number" min={1} defaultValue={(lessonsByModule[module.id]?.length ?? 0) + 1} />
                    </div>
                    <Input label="Video URL" name="videoUrl" placeholder="https://..." />
                    <Input label="Upload PDF file" name="pdfFile" type="file" accept="application/pdf" />
                    <Input label="PDF storage path" name="pdfPath" placeholder="tenant/course/module/file.pdf" />
                    <Textarea label="Text content" name="content" />
                    <Textarea label="Assignment prompt" name="assignmentPrompt" />
                    <Input label="Due date (optional)" name="dueAt" type="datetime-local" />
                    <Button className="w-fit" size="sm" type="submit">
                      Add lesson
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ))}

          {isOwner ? (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-text-primary">Add module</h2>
              </CardHeader>
              <CardContent>
                <form action={createModuleAction} className="grid gap-4 md:grid-cols-[1fr_120px_auto] md:items-end">
                  <input name="courseId" type="hidden" value={course.id} />
                  <Input label="Module title" name="title" required />
                  <Input label="Position" name="position" type="number" min={1} defaultValue={(modules?.length ?? 0) + 1} />
                  <Button type="submit">Add</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <h2 className="flex items-center gap-2 font-semibold text-text-primary">
              <Megaphone size={18} />
              Announcements
            </h2>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isOwner ? (
              <form action={createAnnouncementAction} className="grid gap-3">
                <input name="courseId" type="hidden" value={course.id} />
                <Input label="Title" name="title" required />
                <Textarea label="Message" name="body" required />
                <SubmitButton className="w-fit" size="sm" pendingLabel="Posting…">
                  Post announcement
                </SubmitButton>
              </form>
            ) : null}

            <div className="grid gap-3">
              {((announcements ?? []) as AnnouncementRow[]).length === 0 ? (
                <p className="text-sm text-text-secondary">No announcements yet.</p>
              ) : (
                ((announcements ?? []) as AnnouncementRow[]).map((announcement) => (
                  <div key={announcement.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-text-primary">{announcement.title}</p>
                      {isOwner ? (
                        <form action={deleteAnnouncementAction}>
                          <input name="courseId" type="hidden" value={course.id} />
                          <input name="announcementId" type="hidden" value={announcement.id} />
                          <ConfirmSubmitButton
                            aria-label={`Delete announcement: ${announcement.title}`}
                            confirmMessage={`Delete the announcement "${announcement.title}"? Students will no longer see it.`}
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 size={14} />
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">{announcement.body}</p>
                    <p className="mt-2 text-xs text-text-secondary">{formatDateTime(announcement.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <h2 className="flex items-center gap-2 font-semibold text-text-primary">
              <UsersRound size={18} />
              Sections
            </h2>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isOwner ? (
              <form action={createSectionAction} className="grid gap-3">
                <input name="courseId" type="hidden" value={course.id} />
                <Input label="Section name" name="name" placeholder="Section B" required />
                <Input label="Instructor email" name="instructorEmail" type="email" placeholder="instructor@example.edu" required />
                <Input label="Capacity (optional)" name="capacity" type="number" min={1} />
                <SubmitButton className="w-fit" size="sm" pendingLabel="Creating…">
                  Add section
                </SubmitButton>
              </form>
            ) : null}
            <div className="grid gap-2">
              {((sections ?? []) as SectionWithInstructor[]).map((section) => {
                const enrolledCount = ((enrollments ?? []) as EnrollmentWithProfile[]).filter(
                  (enrollment) => enrollment.section_id === section.id
                ).length;
                return (
                  <div key={section.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-3 text-sm">
                    <div>
                      <p className="font-semibold text-text-primary">{section.name}</p>
                      <p className="text-xs text-text-secondary">{section.profiles?.full_name ?? "Instructor"}</p>
                    </div>
                    <Badge tone="blue">
                      {enrolledCount}
                      {section.capacity ? ` / ${section.capacity}` : ""} enrolled
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <h2 className="flex items-center gap-2 font-semibold text-text-primary">
              <UsersRound size={18} />
              Enrolled students
            </h2>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(enrollments ?? []).length === 0 ? (
              <p className="text-sm text-text-secondary">No students enrolled yet.</p>
            ) : (
              ((enrollments ?? []) as EnrollmentWithProfile[]).map((enrollment) => {
                const inactiveDays = daysSince(enrollment.last_activity_at);
                const atRisk = enrollment.status === "active" && inactiveDays >= AT_RISK_DAYS;
                const section = ((sections ?? []) as SectionWithInstructor[]).find((s) => s.id === enrollment.section_id);

                return (
                  <div key={enrollment.id} className="rounded-xl border border-border p-3">
                    <p className="font-semibold text-text-primary">{enrollment.profiles?.full_name ?? "Student"}</p>
                    <p className="text-sm text-text-secondary">{enrollment.profiles?.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-primary-hover">{enrollment.progress_percent}% complete</span>
                      <Badge tone="slate">{section?.name ?? "Unassigned section"}</Badge>
                      {enrollment.status === "dropped" ? <Badge tone="amber">dropped</Badge> : null}
                      {atRisk ? <Badge tone="amber">at risk — {inactiveDays}d inactive</Badge> : null}
                    </div>
                    {enrollment.status === "dropped" && enrollment.dropped_automatically && profile.role === "admin" ? (
                      <form action={reactivateEnrollmentAction} className="mt-3">
                        <input name="courseId" type="hidden" value={course.id} />
                        <input name="enrollmentId" type="hidden" value={enrollment.id} />
                        <ConfirmSubmitButton
                          size="sm"
                          variant="secondary"
                          confirmMessage={`Reactivate ${enrollment.profiles?.full_name ?? "this student"}'s enrollment? This gives them 15/20 fresh days before the next inactivity check.`}
                        >
                          Reactivate
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
