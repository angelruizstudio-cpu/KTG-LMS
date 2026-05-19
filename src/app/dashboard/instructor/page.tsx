import { BookOpen, Trophy, UsersRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InstructorDashboardPage() {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const supabase = await createSupabaseServerClient();

  const [{ count: courses }, { count: enrollments }, { count: grades }] = await Promise.all([
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("created_by", profile.id),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase.from("gradebook_entries").select("*", { count: "exact", head: true })
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Instructor dashboard</h1>
          <p className="mt-2 text-text-secondary">Create courses, track enrollment, and manage learning outcomes.</p>
        </div>
        <LinkButton href="/dashboard/instructor/courses">Create course</LinkButton>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Courses", value: courses ?? 0, Icon: BookOpen },
          { label: "Enrollments", value: enrollments ?? 0, Icon: UsersRound },
          { label: "Grade entries", value: grades ?? 0, Icon: Trophy }
        ].map(({ label, value, Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-secondary">{label}</p>
                <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
              </div>
              <Icon className="text-secondary" size={28} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
