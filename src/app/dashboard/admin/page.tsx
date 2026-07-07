import { BookOpen, UserPlus, UsersRound } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { requireProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  await requireProfile(["admin"]);
  const supabase = await createSupabaseServerClient();
  const { t } = await getDictionary();
  const td = t.dashboard.admin;

  const [{ count: users }, { count: programs }, { count: courses }, { count: enrollments }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("programs").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("*", { count: "exact", head: true })
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{td.title}</h1>
          <p className="mt-2 text-text-secondary">{td.subtitle}</p>
        </div>
        <LinkButton href="/dashboard/admin/users">
          <UserPlus size={18} />
          {td.manageUsers}
        </LinkButton>
      </div>

        <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: td.users, value: users ?? 0, Icon: UsersRound },
          { label: td.programs, value: programs ?? 0, Icon: BookOpen },
          { label: td.courses, value: courses ?? 0, Icon: BookOpen },
          { label: td.enrollments, value: enrollments ?? 0, Icon: UsersRound }
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

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">{td.checklistTitle}</h2>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-text-secondary">
          <p>{td.checklistStep1}</p>
          <p>{td.checklistStep2}</p>
          <p>{td.checklistStep3}</p>
        </CardContent>
      </Card>
    </div>
  );
}
