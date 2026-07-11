import { ClipboardCheck, Inbox, Trophy, UsersRound } from "lucide-react";

import { gradeAssignmentSubmissionAction } from "@/app/dashboard/instructor/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GradebookEntry = {
  id: string;
  item_name: string;
  score: number;
  max_score: number;
  feedback: string | null;
  created_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
  courses?: { title?: string | null } | null;
};

type AssignmentSubmission = {
  id: string;
  student_id: string;
  submission_text: string;
  file_path: string | null;
  status: string;
  grade_score: number | null;
  max_score: number;
  feedback: string | null;
  submitted_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
  lessons?: {
    title?: string | null;
    course_modules?: {
      course_id?: string | null;
      courses?: { title?: string | null } | null;
    } | null;
  } | null;
};

export default async function InstructorGradebookPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireProfile(["instructor", "admin"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { t } = await getDictionary();
  const tg = t.dashboard.instructor.gradebook;
  const [{ data: entries }, { data: submissions }, { count: enrolledStudents }] = await Promise.all([
    supabase
      .from("gradebook_entries")
      .select("*, profiles:student_id(full_name,email), courses(title)")
      .order("created_at", { ascending: false }),
    supabase
      .from("assignment_submissions")
      .select("*, profiles:student_id(full_name,email), lessons(title, course_modules(course_id, courses(title)))")
      .order("submitted_at", { ascending: false }),
    supabase.from("enrollments").select("student_id", { count: "exact", head: true })
  ]);

  const gradeEntries = (entries ?? []) as GradebookEntry[];
  const assignmentSubmissions = (submissions ?? []) as AssignmentSubmission[];
  const pendingSubmissions = assignmentSubmissions.filter((submission) => submission.status !== "graded");
  const gradedSubmissions = assignmentSubmissions.filter((submission) => submission.status === "graded");
  const averageScore = gradeEntries.length
    ? Math.round(
        gradeEntries.reduce((sum, entry) => sum + (entry.max_score ? (entry.score / entry.max_score) * 100 : 0), 0) /
          gradeEntries.length
      )
    : 0;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">{tg.title}</h1>
        <p className="mt-2 text-text-secondary">{tg.subtitle}</p>
      </div>

      {params.error ? (
        <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">{params.error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: tg.students, value: enrolledStudents ?? 0, Icon: UsersRound, tone: "text-secondary" },
          { label: tg.pendingReview, value: pendingSubmissions.length, Icon: Inbox, tone: "text-warning" },
          { label: tg.gradesPosted, value: gradeEntries.length, Icon: ClipboardCheck, tone: "text-success" },
          { label: tg.averageScore, value: `${averageScore}%`, Icon: Trophy, tone: "text-primary-hover" }
        ].map(({ Icon, label, tone, value }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-secondary">{label}</p>
                <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
              </div>
              <Icon className={tone} size={30} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold text-text-primary">{tg.reviewQueueTitle}</h2>
                <p className="mt-1 text-sm text-text-secondary">{tg.reviewQueueSubtitle}</p>
              </div>
              <Badge tone={pendingSubmissions.length ? "amber" : "green"}>
                {pendingSubmissions.length ? `${pendingSubmissions.length} ${tg.pending}` : tg.clear}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {assignmentSubmissions.length ? (
              assignmentSubmissions.map((submission) => {
                const courseId = submission.lessons?.course_modules?.course_id ?? "";
                const lessonTitle = submission.lessons?.title ?? tg.assignment;

                return (
                  <div key={submission.id} className="grid gap-4 rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-text-primary">{lessonTitle}</h3>
                          <Badge tone={submission.status === "graded" ? "green" : "amber"}>{submission.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">
                          {submission.profiles?.full_name ?? tg.student} · {submission.lessons?.course_modules?.courses?.title ?? tg.course}
                        </p>
                      </div>
                      {submission.grade_score !== null ? (
                        <p className="font-semibold text-text-primary">
                          {submission.grade_score}/{submission.max_score}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-xl bg-surface p-3 text-sm text-text-secondary">
                      <p className="whitespace-pre-line">{submission.submission_text}</p>
                      {submission.file_path ? <p className="mt-2 font-semibold text-primary-hover">{submission.file_path}</p> : null}
                    </div>

                    <form action={gradeAssignmentSubmissionAction} className="grid gap-3 md:grid-cols-[1fr_100px_100px_auto] md:items-end">
                      <input name="courseId" type="hidden" value={courseId} />
                      <input name="submissionId" type="hidden" value={submission.id} />
                      <input name="studentId" type="hidden" value={submission.student_id} />
                      <input name="itemName" type="hidden" value={`Assignment: ${lessonTitle}`} />
                      <input name="returnTo" type="hidden" value="gradebook" />
                      <Textarea
                        defaultValue={submission.feedback ?? ""}
                        label={tg.feedback}
                        name="feedback"
                        placeholder={tg.feedbackPlaceholder}
                      />
                      <Input defaultValue={submission.grade_score ?? ""} label={tg.score} name="score" type="number" min={0} required />
                      <Input defaultValue={submission.max_score} label={tg.max} name="maxScore" type="number" min={1} required />
                      <Button disabled={!courseId} type="submit">
                        {tg.saveGrade}
                      </Button>
                    </form>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
                <p className="font-semibold text-text-primary">{tg.noSubmissionsTitle}</p>
                <p className="mt-2 text-sm text-text-secondary">{tg.noSubmissionsDescription}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">{tg.recentGrades}</h2>
            </CardHeader>
            <CardContent className="grid gap-3">
              {gradeEntries.length ? (
                gradeEntries.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text-primary">{entry.profiles?.full_name ?? tg.student}</p>
                        <p className="mt-1 text-sm text-text-secondary">{entry.item_name}</p>
                        <p className="text-xs text-text-secondary">{entry.courses?.title}</p>
                      </div>
                      <Badge tone="blue">
                        {entry.score}/{entry.max_score}
                      </Badge>
                    </div>
                    {entry.feedback ? <p className="mt-3 text-sm text-text-secondary">{entry.feedback}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-secondary">{tg.noGradesPosted}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">{tg.gradedHistory}</h2>
            </CardHeader>
            <CardContent className="grid gap-3">
              {gradedSubmissions.length ? (
                gradedSubmissions.slice(0, 6).map((submission) => (
                  <div key={submission.id} className="rounded-xl border border-border bg-background p-3">
                    <p className="font-semibold text-text-primary">{submission.lessons?.title ?? tg.assignment}</p>
                    <p className="mt-1 text-sm text-text-secondary">{submission.profiles?.full_name ?? tg.student}</p>
                    <p className="mt-2 text-sm font-semibold text-primary-hover">
                      {submission.grade_score}/{submission.max_score}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-secondary">{tg.gradedHistoryEmpty}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
