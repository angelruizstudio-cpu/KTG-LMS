import { CalendarRange, Clock, Megaphone } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type CalendarEvent = {
  date: string;
  type: "due" | "announcement";
  title: string;
  courseId: string;
  courseTitle: string;
};

export default async function InstructorCalendarPage() {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const supabase = await createSupabaseServerClient();

  const coursesQuery =
    profile.role === "admin" ? supabase.from("courses").select("id,title") : supabase.from("courses").select("id,title").eq("created_by", profile.id);
  const { data: courses } = await coursesQuery;
  const courseIds = (courses ?? []).map((course) => course.id);
  const courseTitleById = new Map((courses ?? []).map((course) => [course.id, course.title]));

  const [{ data: modules }, { data: announcements }] = await Promise.all([
    courseIds.length
      ? supabase.from("course_modules").select("id,course_id").in("course_id", courseIds)
      : Promise.resolve({ data: [] as { id: string; course_id: string }[] }),
    courseIds.length
      ? supabase.from("course_announcements").select("*").in("course_id", courseIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; course_id: string; title: string; created_at: string }[] })
  ]);

  const moduleIds = (modules ?? []).map((module) => module.id);
  const moduleCourseId = new Map((modules ?? []).map((module) => [module.id, module.course_id]));
  const { data: lessons } = moduleIds.length
    ? await supabase.from("lessons").select("id,title,due_at,module_id").in("module_id", moduleIds).not("due_at", "is", null)
    : { data: [] as { id: string; title: string; due_at: string | null; module_id: string }[] };

  const dueEvents: CalendarEvent[] = (lessons ?? [])
    .filter((lesson) => Boolean(lesson.due_at))
    .map((lesson) => {
      const courseId = moduleCourseId.get(lesson.module_id) ?? "";
      return {
        date: lesson.due_at as string,
        type: "due" as const,
        title: lesson.title,
        courseId,
        courseTitle: courseTitleById.get(courseId) ?? "Course"
      };
    });

  const announcementEvents: CalendarEvent[] = (announcements ?? []).map((announcement) => ({
    date: announcement.created_at,
    type: "announcement" as const,
    title: announcement.title,
    courseId: announcement.course_id,
    courseTitle: courseTitleById.get(announcement.course_id) ?? "Course"
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
        <p className="mt-2 text-text-secondary">Assignment due dates and announcements across your courses.</p>
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
                    href={`/dashboard/instructor/courses/${event.courseId}`}
                  >
                    <div className="flex items-center gap-3">
                      {event.type === "due" ? <Clock className="text-secondary" size={18} /> : <Megaphone className="text-secondary" size={18} />}
                      <div>
                        <p className="font-semibold text-text-primary">{event.title}</p>
                        <p className="text-xs text-text-secondary">{event.courseTitle}</p>
                      </div>
                    </div>
                    <Badge tone={event.type === "due" ? "blue" : "slate"}>{event.type === "due" ? "assignment due" : "announcement"}</Badge>
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
