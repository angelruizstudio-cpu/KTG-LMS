import { BookOpen, Trophy, UsersRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { requireProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InstructorDashboardPage() {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { t } = await getDictionary();
  const td = t.dashboard.instructor;

  const [{ count: courses }, { count: enrollments }, { count: grades }] = await Promise.all([
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("created_by", profile.id),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase.from("gradebook_entries").select("*", { count: "exact", head: true })
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{td.title}</h1>
          <p className="mt-2 text-text-secondary">{td.subtitle}</p>
        </div>
        <LinkButton href="/dashboard/instructor/courses">{td.createCourse}</LinkButton>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: td.courses, value: courses ?? 0, Icon: BookOpen },
          { label: td.enrollments, value: enrollments ?? 0, Icon: UsersRound },
          { label: td.gradeEntries, value: grades ?? 0, Icon: Trophy }
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
