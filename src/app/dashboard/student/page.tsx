import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

export default async function StudentDashboardPage() {
  const { profile } = await requireProfile(["student", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, courses(*)")
    .eq("student_id", profile.id)
    .order("enrolled_at", { ascending: false });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">My learning</h1>
          <p className="mt-2 text-text-secondary">Continue courses, track progress, and earn certificates.</p>
        </div>
        <LinkButton href="/dashboard/student/catalog">View program courses</LinkButton>
      </div>
      {(enrollments ?? []).length === 0 ? (
        <EmptyState
          action={<LinkButton href="/dashboard/student/catalog">View program courses</LinkButton>}
          description="Your active courses appear here after an administrator grants access from your program."
          title="No active courses yet"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {((enrollments ?? []) as EnrollmentWithCourse[]).map((enrollment) => (
            <Link key={enrollment.id} href={`/dashboard/student/courses/${enrollment.course_id}`}>
              <Card className="h-full transition hover:border-primary hover:shadow-glow">
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
                  <p className="mt-2 text-sm font-semibold text-text-secondary">{enrollment.progress_percent}% complete</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
