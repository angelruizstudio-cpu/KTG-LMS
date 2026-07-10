import { AlertTriangle, BarChart3, MessagesSquare, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const AT_RISK_DAYS = 10;

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

type EnrollmentRow = {
  course_id: string;
  status: string;
  progress_percent: number;
  last_activity_at: string;
};

export default async function InstructorAnalyticsPage() {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const supabase = await createSupabaseServerClient();

  const coursesQuery =
    profile.role === "admin" ? supabase.from("courses").select("id,title") : supabase.from("courses").select("id,title").eq("created_by", profile.id);
  const { data: courses } = await coursesQuery;
  const courseIds = (courses ?? []).map((course) => course.id);

  const [{ data: enrollments }, { data: threads }] = await Promise.all([
    courseIds.length
      ? supabase.from("enrollments").select("course_id,status,progress_percent,last_activity_at").in("course_id", courseIds)
      : Promise.resolve({ data: [] as EnrollmentRow[] }),
    courseIds.length
      ? supabase.from("discussion_threads").select("id,course_id").in("course_id", courseIds)
      : Promise.resolve({ data: [] as { id: string; course_id: string }[] })
  ]);

  const threadIds = (threads ?? []).map((thread) => thread.id);
  const { data: repliesForThreads } = threadIds.length
    ? await supabase.from("discussion_replies").select("id,thread_id").in("thread_id", threadIds)
    : { data: [] as { id: string; thread_id: string }[] };

  const threadCourseById = new Map((threads ?? []).map((thread) => [thread.id, thread.course_id]));
  const repliesByCourse = (repliesForThreads ?? []).reduce<Record<string, number>>((acc, reply) => {
    const courseId = threadCourseById.get(reply.thread_id);
    if (courseId) {
      acc[courseId] = (acc[courseId] ?? 0) + 1;
    }
    return acc;
  }, {});
  const threadsByCourse = (threads ?? []).reduce<Record<string, number>>((acc, thread) => {
    acc[thread.course_id] = (acc[thread.course_id] ?? 0) + 1;
    return acc;
  }, {});

  const typedEnrollments = (enrollments ?? []) as EnrollmentRow[];
  const enrollmentsByCourse = typedEnrollments.reduce<Record<string, EnrollmentRow[]>>((acc, enrollment) => {
    acc[enrollment.course_id] = [...(acc[enrollment.course_id] ?? []), enrollment];
    return acc;
  }, {});

  const totalStudents = typedEnrollments.length;
  const activeEnrollments = typedEnrollments.filter((enrollment) => enrollment.status === "active");
  const atRiskEnrollments = activeEnrollments.filter((enrollment) => daysSince(enrollment.last_activity_at) >= AT_RISK_DAYS);
  const averageProgress = typedEnrollments.length
    ? Math.round(typedEnrollments.reduce((sum, enrollment) => sum + enrollment.progress_percent, 0) / typedEnrollments.length)
    : 0;

  const courseStats = (courses ?? []).map((course) => {
    const courseEnrollments = enrollmentsByCourse[course.id] ?? [];
    const courseActive = courseEnrollments.filter((enrollment) => enrollment.status === "active");
    const courseAtRisk = courseActive.filter((enrollment) => daysSince(enrollment.last_activity_at) >= AT_RISK_DAYS);
    const courseAvgProgress = courseEnrollments.length
      ? Math.round(courseEnrollments.reduce((sum, enrollment) => sum + enrollment.progress_percent, 0) / courseEnrollments.length)
      : 0;

    return {
      id: course.id,
      title: course.title,
      enrolled: courseEnrollments.length,
      completed: courseEnrollments.filter((enrollment) => enrollment.status === "completed").length,
      atRisk: courseAtRisk.length,
      avgProgress: courseAvgProgress,
      threads: threadsByCourse[course.id] ?? 0,
      replies: repliesByCourse[course.id] ?? 0
    };
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-text-primary">
          <BarChart3 size={26} />
          Analytics
        </h1>
        <p className="mt-2 text-text-secondary">Aggregate progress, at-risk students, and discussion activity across your courses.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total students", value: totalStudents, Icon: UsersRound, tone: "text-secondary" },
          { label: "Average progress", value: `${averageProgress}%`, Icon: BarChart3, tone: "text-primary-hover" },
          { label: "At risk", value: atRiskEnrollments.length, Icon: AlertTriangle, tone: "text-warning" },
          { label: "Discussion threads", value: threads?.length ?? 0, Icon: MessagesSquare, tone: "text-success" }
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

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">By course</h2>
        </CardHeader>
        <CardContent className="grid gap-3">
          {courseStats.length === 0 ? (
            <p className="text-sm text-text-secondary">No courses yet.</p>
          ) : (
            courseStats.map((stat) => (
              <div key={stat.id} className="grid gap-2 rounded-xl border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-text-primary">{stat.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="slate">{stat.enrolled} enrolled</Badge>
                    <Badge tone="green">{stat.completed} completed</Badge>
                    {stat.atRisk > 0 ? <Badge tone="amber">{stat.atRisk} at risk</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                  <span>{stat.avgProgress}% average progress</span>
                  <span>
                    {stat.threads} threads · {stat.replies} replies
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
