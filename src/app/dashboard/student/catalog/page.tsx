import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProgramCourse = {
  id: string;
  program_id: string;
  course_id: string;
  position: number;
  required: boolean;
  programs?: { name?: string | null } | null;
  courses?: { id: string; title?: string | null; description?: string | null; status?: string | null } | null;
};

type Enrollment = {
  course_id: string;
  status: "active" | "completed" | "dropped";
  progress_percent: number;
};

type Prerequisite = {
  course_id: string;
  prerequisite_course_id: string;
  prerequisite?: { title?: string | null } | null;
};

export default async function ProgramCoursesPage() {
  const { profile } = await requireProfile(["student", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { t } = await getDictionary();
  const tc = t.dashboard.student.catalog;

  const [{ data: programEnrollments }, { data: enrollments }] = await Promise.all([
    supabase.from("program_enrollments").select("program_id").eq("student_id", profile.id).eq("status", "active"),
    supabase.from("enrollments").select("course_id,status,progress_percent").eq("student_id", profile.id)
  ]);

  const programIds = (programEnrollments ?? []).map((item) => item.program_id);
  const [{ data: programCourses }, { data: prerequisites }] = await Promise.all([
    programIds.length
      ? supabase
          .from("program_courses")
          .select("*, programs(name), courses(id,title,description,status)")
          .in("program_id", programIds)
          .order("position")
      : Promise.resolve({ data: [] as ProgramCourse[] }),
    supabase.from("course_prerequisites").select("*, prerequisite:prerequisite_course_id(title)")
  ]);

  const enrollmentsByCourse = new Map(((enrollments ?? []) as Enrollment[]).map((enrollment) => [enrollment.course_id, enrollment]));
  const completedCourseIds = new Set(
    ((enrollments ?? []) as Enrollment[]).filter((enrollment) => enrollment.status === "completed").map((enrollment) => enrollment.course_id)
  );
  const prerequisitesByCourse = ((prerequisites ?? []) as Prerequisite[]).reduce<Record<string, Prerequisite[]>>((acc, prerequisite) => {
    acc[prerequisite.course_id] = [...(acc[prerequisite.course_id] ?? []), prerequisite];
    return acc;
  }, {});

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">{tc.title}</h1>
        <p className="mt-2 text-text-secondary">{tc.subtitle}</p>
      </div>

      {(programCourses ?? []).length === 0 ? (
        <Card>
          <CardContent className="grid gap-3 py-12 text-center">
            <h2 className="text-lg font-semibold text-text-primary">{tc.noProgramTitle}</h2>
            <p className="text-sm text-text-secondary">{tc.noProgramDescription}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {((programCourses ?? []) as ProgramCourse[]).map((item) => {
            const course = item.courses;
            const enrollment = enrollmentsByCourse.get(item.course_id);
            const coursePrerequisites = prerequisitesByCourse[item.course_id] ?? [];
            const missingPrerequisites = coursePrerequisites.filter(
              (prerequisite) => !completedCourseIds.has(prerequisite.prerequisite_course_id)
            );
            const hasAccess = Boolean(enrollment);
            const isLocked = missingPrerequisites.length > 0;

            return (
              <Card key={item.id} className="h-full">
                <CardContent className="grid h-full gap-5">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge tone={hasAccess ? "green" : isLocked ? "amber" : "blue"}>
                        {hasAccess ? tc.accessGranted : isLocked ? tc.locked : tc.pendingAccess}
                      </Badge>
                      <Badge tone="slate">{item.programs?.name ?? tc.program}</Badge>
                    </div>
                    <h2 className="text-lg font-bold text-text-primary">{course?.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-secondary">{course?.description}</p>
                  </div>

                  {missingPrerequisites.length ? (
                    <div className="rounded-xl bg-warning-light p-3 text-sm text-text-secondary">
                      <p className="font-semibold text-text-primary">{tc.prerequisitesRequired}</p>
                      <p className="mt-1">
                        {tc.complete}: {missingPrerequisites.map((prerequisite) => prerequisite.prerequisite?.title).join(", ")}
                      </p>
                    </div>
                  ) : null}

                  {hasAccess ? (
                    <Link
                      className="mt-auto inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-text-inverse shadow-glow hover:bg-primary-hover"
                      href={`/dashboard/student/courses/${item.course_id}`}
                    >
                      {tc.continueCourse}
                    </Link>
                  ) : (
                    <div className="mt-auto rounded-xl border border-border bg-background p-3 text-sm text-text-secondary">
                      {isLocked ? tc.unlockAfterPrerequisites : tc.waitingForAccess}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
