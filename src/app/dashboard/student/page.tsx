import { Award, BookOpenCheck, CalendarDays, CheckCircle2, ClipboardCheck, MessageSquareText } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EnrollmentWithCourse = {
  id: string;
  course_id: string;
  status: "active" | "completed" | "dropped";
  progress_percent: number;
  courses?: { title?: string | null; description?: string | null } | null;
};

type ProgramEnrollment = {
  program_id: string;
  programs?: { name?: string | null } | null;
};

type FinanceClearance = {
  program_id: string;
  status: string;
  notes: string | null;
};

type ProgramCertificate = {
  program_id: string;
  certificate_number: string;
  issued_at: string;
};

type ModuleRow = {
  id: string;
  course_id: string;
  position: number;
};

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  lesson_type: string;
  position: number;
};

type LessonProgress = {
  lesson_id: string;
  completed: boolean;
};

type GradebookEntry = {
  id: string;
  course_id: string;
  item_name: string;
  score: number;
  max_score: number;
  feedback: string | null;
  created_at: string;
  courses?: { title?: string | null } | null;
};

type AssignmentSubmission = {
  id: string;
  lesson_id: string;
  status: string;
  grade_score: number | null;
  max_score: number;
  feedback: string | null;
  submitted_at: string;
};

export default async function StudentDashboardPage() {
  const { profile } = await requireProfile(["student", "admin"]);
  const supabase = await createSupabaseServerClient();

  const [{ data: enrollments }, { data: programEnrollments }, { data: financeClearances }, { data: programCertificates }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("*, courses(title,description)")
        .eq("student_id", profile.id)
        .order("enrolled_at", { ascending: false }),
      supabase.from("program_enrollments").select("program_id, programs(name)").eq("student_id", profile.id).eq("status", "active"),
      supabase.from("finance_clearances").select("program_id,status,notes").eq("student_id", profile.id),
      supabase.from("program_certificates").select("program_id,certificate_number,issued_at").eq("student_id", profile.id)
    ]);

  const activeEnrollments = ((enrollments ?? []) as EnrollmentWithCourse[]).filter((enrollment) => enrollment.status !== "dropped");
  const activeCourseIds = activeEnrollments.map((enrollment) => enrollment.course_id);

  const [{ data: modules }, { data: gradebookEntries }, { data: submissions }] = await Promise.all([
    activeCourseIds.length
      ? supabase.from("course_modules").select("id,course_id,position").in("course_id", activeCourseIds).order("position")
      : Promise.resolve({ data: [] as ModuleRow[] }),
    activeCourseIds.length
      ? supabase
          .from("gradebook_entries")
          .select("*, courses(title)")
          .eq("student_id", profile.id)
          .in("course_id", activeCourseIds)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as GradebookEntry[] }),
    supabase
      .from("assignment_submissions")
      .select("id,lesson_id,status,grade_score,max_score,feedback,submitted_at")
      .eq("student_id", profile.id)
      .order("submitted_at", { ascending: false })
      .limit(5)
  ]);

  const moduleRows = (modules ?? []) as ModuleRow[];
  const moduleIds = moduleRows.map((module) => module.id);
  const [{ data: lessons }, { data: lessonProgress }] = await Promise.all([
    moduleIds.length
      ? supabase.from("lessons").select("id,module_id,title,lesson_type,position").in("module_id", moduleIds).order("position")
      : Promise.resolve({ data: [] as LessonRow[] }),
    moduleIds.length
      ? supabase.from("lesson_progress").select("lesson_id,completed").eq("student_id", profile.id)
      : Promise.resolve({ data: [] as LessonProgress[] })
  ]);

  const modulesByCourse = moduleRows.reduce<Record<string, ModuleRow[]>>((acc, module) => {
    acc[module.course_id] = [...(acc[module.course_id] ?? []), module];
    return acc;
  }, {});
  const lessonsByModule = ((lessons ?? []) as LessonRow[]).reduce<Record<string, LessonRow[]>>((acc, lesson) => {
    acc[lesson.module_id] = [...(acc[lesson.module_id] ?? []), lesson];
    return acc;
  }, {});
  const completedLessonIds = new Set(
    ((lessonProgress ?? []) as LessonProgress[]).filter((progress) => progress.completed).map((progress) => progress.lesson_id)
  );
  const nextLessonsByCourse = new Map(
    activeEnrollments.map((enrollment) => {
      const orderedLessons = (modulesByCourse[enrollment.course_id] ?? []).flatMap((module) => lessonsByModule[module.id] ?? []);
      return [enrollment.course_id, orderedLessons.find((lesson) => !completedLessonIds.has(lesson.id))];
    })
  );
  const certificateByProgram = new Map(((programCertificates ?? []) as ProgramCertificate[]).map((item) => [item.program_id, item]));
  const financeByProgram = new Map(((financeClearances ?? []) as FinanceClearance[]).map((item) => [item.program_id, item]));
  const averageProgress = activeEnrollments.length
    ? Math.round(activeEnrollments.reduce((sum, enrollment) => sum + enrollment.progress_percent, 0) / activeEnrollments.length)
    : 0;
  const toDoItems = activeEnrollments
    .map((enrollment) => ({ enrollment, lesson: nextLessonsByCourse.get(enrollment.course_id) }))
    .filter((item): item is { enrollment: EnrollmentWithCourse; lesson: LessonRow } => Boolean(item.lesson))
    .slice(0, 5);
  const recentFeedback = [
    ...(((gradebookEntries ?? []) as GradebookEntry[]).map((entry) => ({
      id: `grade-${entry.id}`,
      title: entry.item_name,
      context: entry.courses?.title ?? "Course",
      detail: `${entry.score}/${entry.max_score}${entry.feedback ? ` - ${entry.feedback}` : ""}`,
      date: entry.created_at
    })) ?? []),
    ...(((submissions ?? []) as AssignmentSubmission[])
      .filter((submission) => submission.feedback || submission.grade_score !== null)
      .map((submission) => ({
        id: `submission-${submission.id}`,
        title: "Assignment feedback",
        context: submission.status,
        detail:
          submission.grade_score !== null
            ? `${submission.grade_score}/${submission.max_score}${submission.feedback ? ` - ${submission.feedback}` : ""}`
            : submission.feedback ?? "Feedback available",
        date: submission.submitted_at
      })) ?? [])
  ]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">My learning</h1>
          <p className="mt-2 text-text-secondary">Continue assigned courses, track program progress, and earn certificates.</p>
        </div>
        <LinkButton href="/dashboard/student/catalog">View program courses</LinkButton>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-secondary">Active courses</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{activeEnrollments.length}</p>
            </div>
            <BookOpenCheck className="text-secondary" size={34} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-secondary">Average progress</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{averageProgress}%</p>
            </div>
            <CheckCircle2 className="text-success" size={34} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-secondary">Certificates</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{(programCertificates ?? []).length}</p>
            </div>
            <Award className="text-primary-hover" size={34} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          {activeEnrollments.length === 0 ? (
            <EmptyState
              action={<LinkButton href="/dashboard/student/catalog">View program courses</LinkButton>}
              description="Your active courses appear here after an administrator grants access from your program."
              title="No active courses yet"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeEnrollments.map((enrollment) => {
                const nextLesson = nextLessonsByCourse.get(enrollment.course_id);
                return (
                  <Link key={enrollment.id} href={`/dashboard/student/courses/${enrollment.course_id}`}>
                    <Card className="h-full overflow-hidden transition hover:border-primary hover:shadow-glow">
                      <div className="h-24 bg-[linear-gradient(135deg,var(--secondary-light),var(--primary-light),var(--accent))]" />
                      <CardContent>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-lg font-bold text-text-primary">{enrollment.courses?.title}</h2>
                            <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{enrollment.courses?.description}</p>
                          </div>
                          <Badge tone={enrollment.status === "completed" ? "green" : "blue"}>{enrollment.status}</Badge>
                        </div>
                        <div className="mt-6 h-2 rounded-full bg-secondary-light">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${enrollment.progress_percent}%` }} />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-text-secondary">{enrollment.progress_percent}% complete</span>
                          {nextLesson ? <span className="font-semibold text-primary-hover">Next: {nextLesson.title}</span> : null}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Program certificate status</h2>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(programEnrollments ?? []).length ? (
                ((programEnrollments ?? []) as ProgramEnrollment[]).map((programEnrollment) => {
                  const finance = financeByProgram.get(programEnrollment.program_id);
                  const certificate = certificateByProgram.get(programEnrollment.program_id);
                  return (
                    <div key={programEnrollment.program_id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text-primary">{programEnrollment.programs?.name ?? "Program"}</p>
                          <p className="mt-1 text-sm text-text-secondary">
                            Finance: <span className="font-semibold">{finance?.status ?? "hold"}</span>
                          </p>
                        </div>
                        <Badge tone={certificate ? "green" : finance?.status === "cleared" ? "blue" : "amber"}>
                          {certificate ? "certificate issued" : finance?.status === "cleared" ? "finance cleared" : "pending clearance"}
                        </Badge>
                      </div>
                      {certificate ? (
                        <p className="mt-3 font-mono text-xs text-text-secondary">{certificate.certificate_number}</p>
                      ) : finance?.notes ? (
                        <p className="mt-3 text-sm text-text-secondary">{finance.notes}</p>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-text-secondary">No active program enrollment yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CalendarDays className="text-secondary" size={18} />
              <h2 className="font-semibold text-text-primary">To do</h2>
            </CardHeader>
            <CardContent className="grid gap-3">
              {toDoItems.length ? (
                toDoItems.map(({ enrollment, lesson }) => (
                  <Link
                    key={lesson.id}
                    className="rounded-xl border border-border bg-background p-3 transition hover:border-primary hover:bg-primary-light/40"
                    href={`/dashboard/student/courses/${enrollment.course_id}`}
                  >
                    <p className="text-sm font-semibold text-text-primary">{lesson.title}</p>
                    <p className="mt-1 text-xs text-text-secondary">{enrollment.courses?.title}</p>
                    <Badge className="mt-3" tone={lesson.lesson_type === "quiz" ? "pink" : lesson.lesson_type === "assignment" ? "amber" : "blue"}>
                      {lesson.lesson_type}
                    </Badge>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-text-secondary">No pending lessons right now.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <MessageSquareText className="text-primary-hover" size={18} />
              <h2 className="font-semibold text-text-primary">Recent feedback</h2>
            </CardHeader>
            <CardContent className="grid gap-3">
              {recentFeedback.length ? (
                recentFeedback.map((feedback) => (
                  <div key={feedback.id} className="rounded-xl border border-border bg-background p-3">
                    <p className="text-sm font-semibold text-text-primary">{feedback.title}</p>
                    <p className="mt-1 text-xs text-text-secondary">{feedback.context}</p>
                    <p className="mt-2 text-sm text-text-secondary">{feedback.detail}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-secondary">Grades and instructor feedback will appear here.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <ClipboardCheck className="text-success" size={18} />
              <h2 className="font-semibold text-text-primary">Academic flow</h2>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-text-secondary">
              <p>1. Complete assigned courses.</p>
              <p>2. Pass quizzes and submitted work.</p>
              <p>3. Finance clears the account.</p>
              <p>4. Certificate is conferred.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
