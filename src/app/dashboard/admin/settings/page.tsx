import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { switchTenantAction } from "../../tenant-actions";
import { addTenantMemberAction } from "./actions";

export default async function AdminSettingsPage() {
  const { profile } = await requireProfile(["admin"]);
  const supabase = await createSupabaseServerClient();
  const [{ data: activeTenant }, { data: memberships }, { data: myOrganizations }] = await Promise.all([
    supabase.from("tenants").select("name,slug,code").eq("id", profile.default_tenant_id).maybeSingle(),
    supabase
      .from("tenant_memberships")
      .select("role,status,profiles:user_id(full_name,email)")
      .eq("tenant_id", profile.default_tenant_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_memberships")
      .select("tenant_id,role,status,created_at,tenants(name,slug,code,status)")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
        <p className="mt-2 text-text-secondary">Operational setup for organizations, Supabase, storage, and Stripe.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">My organizations</h2>
          <p className="text-sm text-text-secondary">Organizations where your account has an active membership.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase text-text-secondary">
                <tr>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">My role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {(myOrganizations ?? []).map((membership) => {
                  const tenant = Array.isArray(membership.tenants) ? membership.tenants[0] : membership.tenants;
                  const isActive = membership.tenant_id === profile.default_tenant_id;

                  return (
                    <tr key={membership.tenant_id}>
                      <td className="px-4 py-3 font-semibold text-text-primary">{tenant?.name ?? "Organization"}</td>
                      <td className="px-4 py-3 text-text-secondary">{tenant?.slug ?? "tenant"}</td>
                      <td className="px-4 py-3 font-mono text-text-primary">{tenant?.code ?? "ORG"}</td>
                      <td className="px-4 py-3 capitalize text-text-secondary">{membership.role}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary-light px-3 py-1 text-xs font-bold text-secondary-hover">
                          {isActive ? "Active" : tenant?.status ?? "Available"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isActive ? (
                          <span className="text-xs font-semibold text-text-secondary">Current</span>
                        ) : (
                          <form action={switchTenantAction}>
                            <input name="tenantId" type="hidden" value={membership.tenant_id} />
                            <button
                              className="h-9 rounded-xl bg-primary px-4 text-xs font-bold text-text-inverse transition hover:bg-primary-hover"
                              type="submit"
                            >
                              Switch
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Active organization</h2>
            <p className="text-sm text-text-secondary">
              You are currently managing {activeTenant?.name ?? "this organization"}.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-text-secondary">
            <p>
              Institution code: <span className="font-mono font-semibold text-text-primary">{activeTenant?.code ?? "ORG"}</span>
            </p>
            <p>
              Institution slug: <span className="font-semibold text-text-primary">{activeTenant?.slug ?? "organization"}</span>
            </p>
            <p>New institutions are created from the platform portal by a platform administrator.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Tenant members</h2>
            <p className="text-sm text-text-secondary">
              Add existing users to {activeTenant?.name ?? "the active organization"} with a tenant-specific role.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5">
            <form action={addTenantMemberAction} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <Input label="User email" name="email" placeholder="student@email.com" required type="email" />
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                defaultValue="student"
                name="role"
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
              <button
                className="h-11 rounded-xl bg-secondary px-4 text-sm font-bold text-text-inverse transition hover:bg-secondary-hover"
                type="submit"
              >
                Add member
              </button>
            </form>

            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-xs uppercase text-text-secondary">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {(memberships ?? []).map((membership) => {
                    const memberProfile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;

                    return (
                      <tr key={`${memberProfile?.email}-${membership.role}`}>
                        <td className="px-4 py-3 font-semibold text-text-primary">{memberProfile?.full_name ?? "Unknown"}</td>
                        <td className="px-4 py-3 text-text-secondary">{memberProfile?.email ?? "No email"}</td>
                        <td className="px-4 py-3 capitalize text-text-secondary">{membership.role}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Integration status</h2>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-text-secondary">
          <p>Supabase Auth handles account sessions and role metadata.</p>
          <p>Supabase Storage bucket `lesson-files` is intended for PDFs and course materials.</p>
          <p>Stripe Checkout is triggered when a published course has `price_cents` and `stripe_price_id`.</p>
        </CardContent>
      </Card>
    </div>
  );
}
