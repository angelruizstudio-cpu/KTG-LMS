import { UserPlus } from "lucide-react";

import { createInstructorAction, updateUserRoleAction } from "@/app/dashboard/admin/users/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmSubmitButton, SubmitButton } from "@/components/ui/submit-button";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeBannerMessage } from "@/lib/utils";
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

      {params.error ? <Alert variant="error">{sanitizeBannerMessage(params.error)}</Alert> : null}
      {params.created ? (
        <Alert variant="success" className="font-semibold">
          User created. Institution ID: <span className="font-mono">{sanitizeBannerMessage(params.created, 40)}</span>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <UserPlus size={18} />
            Create institution user
          </h2>
        </CardHeader>
        <CardContent>
          <form action={createInstructorAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_160px_auto] lg:items-end">
            <Input label="Full name" name="fullName" required />
            <Input label="Email" name="email" type="email" required />
            <Input label="Temporary password" name="password" type="password" minLength={8} required />
            <Select label="Role" name="role" defaultValue="student">
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </Select>
            <SubmitButton pendingLabel="Creating…">Create</SubmitButton>
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
                        <Select
                          className="h-9 py-0 font-normal"
                          srLabel={`Change role for ${user.full_name}`}
                          defaultValue={role}
                          name="role"
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                        </Select>
                        <ConfirmSubmitButton
                          size="sm"
                          variant="secondary"
                          confirmMessage={`Change the role for ${user.full_name}? This affects what they can access.`}
                        >
                          Save
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(users ?? []).length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-secondary">
              No users yet. Create your first institution user with the form above.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
