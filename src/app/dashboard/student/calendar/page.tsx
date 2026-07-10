import { CalendarRange, Clock, Megaphone } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, isOverdue } from "@/lib/utils";

type CalendarEvent = {
  date: string;
  type: "due" | "announcement";
  title: string;
  courseId: string;
  courseTitle: string;
  overdue: boolean;
};

export default async function StudentCalendarPage() {
  const { profile } = await requireProfile(["student", "admin"]);
  const supabase = await createSupabaseServerClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, courses(id,title)")
    .eq("student_id", profile.id);

  type EnrollmentWithCourse = { course_id: string; courses?: { id: string; title?: string | null }[] | { id: string; title?: string | null } | null };
  const typedEnrollments = (enrollments ?? []) as unknown as EnrollmentWithCourse[];
  const courseIds = typedEnrollments.map((enrollment) => enrollment.course_id);
  const courseTitleById = new Map(
    typedEnrollments.map((enrollment) => {
      const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
      return [enrollment.course_id, course?.title ?? "Course"];
    })
  );

  const [{ data: modules }, { data: announcements }, { data: progress }] = await Promise.all([
    courseIds.length
      ? supabase.from("course_modules").select("id,course_id").in("course_id", courseIds)
      : Promise.resolve({ data: [] as { id: string; course_id: string }[] }),
    courseIds.length
      ? supabase.from("course_announcements").select("*").in("course_id", courseIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; course_id: string; title: string; created_at: string }[] }),
    supabase.from("lesson_progress").select("lesson_id").eq("student_id", profile.id).eq("completed", true)
  ]);

  const moduleIds = (modules ?? []).map((module) => module.id);
  const moduleCourseId = new Map((modules ?? []).map((module) => [module.id, module.course_id]));
  const { data: lessons } = moduleIds.length
    ? await supabase.from("lessons").select("id,title,due_at,module_id").in("module_id", moduleIds).not("due_at", "is", null)
    : { data: [] as { id: string; title: string; due_at: string | null; module_id: string }[] };

  const completedLessonIds = new Set((progress ?? []).map((item) => item.lesson_id));

  const dueEvents: CalendarEvent[] = (lessons ?? [])
    .filter((lesson) => Boolean(lesson.due_at))
    .map((lesson) => {
      const courseId = moduleCourseId.get(lesson.module_id) ?? "";
      return {
        date: lesson.due_at as string,
        type: "due" as const,
        title: lesson.title,
        courseId,
        courseTitle: courseTitleById.get(courseId) ?? "Course",
        overdue: isOverdue(lesson.due_at, completedLessonIds.has(lesson.id))
      };
    });

  const announcementEvents: CalendarEvent[] = (announcements ?? []).map((announcement) => ({
    date: announcement.created_at,
    type: "announcement" as const,
    title: announcement.title,
    courseId: announcement.course_id,
    courseTitle: courseTitleById.get(announcement.course_id) ?? "Course",
    overdue: false
  }));

  const events = [...dueEvents, ...announcementEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = formatDate(event.date);
    acc[key] = [...(acc[key] ?? []), event];
    return acc;
  }, {});

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-text-primary">
          <CalendarRange size={26} />
          Calendar
        </h1>
        <p className="mt-2 text-text-secondary">Upcoming assignment due dates and course announcements across your active courses.</p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-text-secondary">Nothing scheduled yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Object.entries(eventsByDate).map(([date, dateEvents]) => (
            <Card key={date}>
              <CardHeader>
                <h2 className="font-semibold text-text-primary">{date}</h2>
              </CardHeader>
              <CardContent className="grid gap-3">
                {dateEvents.map((event, index) => (
                  <Link
                    key={`${event.courseId}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary"
                    href={`/dashboard/student/courses/${event.courseId}`}
                  >
                    <div className="flex items-center gap-3">
                      {event.type === "due" ? (
                        <Clock className={event.overdue ? "text-error" : "text-secondary"} size={18} />
                      ) : (
                        <Megaphone className="text-secondary" size={18} />
                      )}
                      <div>
                        <p className="font-semibold text-text-primary">{event.title}</p>
                        <p className="text-xs text-text-secondary">{event.courseTitle}</p>
                      </div>
                    </div>
                    <Badge tone={event.type === "due" ? (event.overdue ? "amber" : "blue") : "slate"}>
                      {event.type === "due" ? "assignment due" : "announcement"}
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
