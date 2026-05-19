import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminCourse = {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

export default async function AdminCoursesPage() {
  await requireProfile(["admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*, profiles:created_by(full_name,email)")
    .order("updated_at", { ascending: false });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Courses</h1>
        <p className="mt-2 text-text-secondary">Review courses before adding them to programs and granting access.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {((courses ?? []) as AdminCourse[]).map((course) => (
          <Link key={course.id} href={`/dashboard/instructor/courses/${course.id}`}>
            <Card className="h-full transition hover:border-primary hover:shadow-glow">
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">{course.title}</h2>
                    <p className="mt-2 text-sm text-text-secondary">By {course.profiles?.full_name ?? "Instructor"}</p>
                  </div>
                  <Badge tone={course.status === "published" ? "green" : "amber"}>{course.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
