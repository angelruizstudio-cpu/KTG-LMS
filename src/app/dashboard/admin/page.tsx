import { BookOpen, UserPlus, UsersRound } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  await requireProfile(["admin"]);
  const supabase = await createSupabaseServerClient();

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
          <h1 className="text-3xl font-bold text-text-primary">Admin dashboard</h1>
          <p className="mt-2 text-text-secondary">Manage people, instructors, courses, and platform health.</p>
        </div>
        <LinkButton href="/dashboard/admin/users">
          <UserPlus size={18} />
          Manage users
        </LinkButton>
      </div>

        <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Users", value: users ?? 0, Icon: UsersRound },
          { label: "Programs", value: programs ?? 0, Icon: BookOpen },
          { label: "Courses", value: courses ?? 0, Icon: BookOpen },
          { label: "Enrollments", value: enrollments ?? 0, Icon: UsersRound }
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
          <h2 className="font-semibold text-text-primary">Launch checklist</h2>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-text-secondary">
          <p>Connect Supabase Auth and run the SQL schema with RLS enabled.</p>
          <p>Create your first admin profile by updating the role in Supabase SQL editor.</p>
          <p>Create programs, add courses to each program, assign students, and grant course access.</p>
        </CardContent>
      </Card>
    </div>
  );
}
