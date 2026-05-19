import { UserPlus } from "lucide-react";

import { createInstructorAction, updateUserRoleAction } from "@/app/dashboard/admin/users/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const roleTone: Record<UserRole, "blue" | "green" | "amber"> = {
  admin: "amber",
  instructor: "blue",
  student: "green"
};

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { profile } = await requireProfile(["admin"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: users }, { data: identities }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase
      .from("tenant_user_identities")
      .select("user_id,institution_user_id,role,status")
      .eq("tenant_id", profile.default_tenant_id)
  ]);
  const identitiesByUser = new Map((identities ?? []).map((identity) => [identity.user_id, identity]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Users</h1>
        <p className="mt-2 text-text-secondary">Create institution users and manage their tenant-specific access IDs.</p>
      </div>

      {params.error ? (
        <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">{params.error}</div>
      ) : null}
      {params.created ? (
        <div className="rounded-xl border border-success bg-success-light px-3 py-2 text-sm font-semibold text-success">
          User created. Institution ID: <span className="font-mono">{params.created}</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <UserPlus size={18} />
            Create institution user
          </h2>
        </CardHeader>
        <CardContent>
          <form action={createInstructorAction} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_160px_auto] md:items-end">
            <Input label="Full name" name="fullName" required />
            <Input label="Email" name="email" type="email" required />
            <Input label="Temporary password" name="password" type="password" minLength={8} required />
            <select
              className="h-11 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              defaultValue="student"
              name="role"
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">All users</h2>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Institution ID</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Change role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(users ?? []).map((user) => {
                const identity = identitiesByUser.get(user.id);
                const role = (identity?.role ?? user.role) as UserRole;

                return (
                  <tr key={user.id}>
                    <td className="px-5 py-4 font-semibold text-text-primary">{user.full_name}</td>
                    <td className="px-5 py-4 font-mono text-text-primary">{identity?.institution_user_id ?? "Not issued"}</td>
                    <td className="px-5 py-4 text-text-secondary">{user.email}</td>
                    <td className="px-5 py-4">
                      <Badge tone={roleTone[role]}>{role}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <form action={updateUserRoleAction} className="flex items-center gap-2">
                        <input name="userId" type="hidden" value={user.id} />
                        <select
                          className="h-9 rounded-xl border border-border bg-surface px-2 text-sm text-text-primary"
                          defaultValue={role}
                          name="role"
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button size="sm" type="submit" variant="secondary">
                          Save
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
