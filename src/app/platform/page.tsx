import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

import { createInstitutionAction, updateInstitutionStatusAction } from "./actions";

export default async function PlatformDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const params = await searchParams;
  await requirePlatformAdmin();
  const supabase = createSupabaseAdminClient();
  const [{ data: tenants }, { count: tenantCount }, { count: userCount }, { count: suspendedCount }] = await Promise.all([
    supabase.from("tenants").select("id,name,slug,code,status,created_at").order("created_at", { ascending: false }),
    supabase.from("tenants").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("tenants").select("*", { count: "exact", head: true }).eq("status", "suspended")
  ]);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo />
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold text-text-secondary hover:text-primary-hover" href="/dashboard">
              Institution portal
            </Link>
            <form action={signOutAction}>
              <Button size="sm" type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-primary-hover">Platform portal</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">LMS administration</h1>
          <p className="mt-2 text-text-secondary">Manage institutions at the platform level.</p>
        </div>

        {params.error ? (
          <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">{params.error}</div>
        ) : null}
        {params.created ? (
          <div className="rounded-xl border border-success bg-success-light px-3 py-2 text-sm font-semibold text-success">
            Institution created with an institution admin.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent>
              <p className="text-sm font-semibold text-text-secondary">Institutions</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{tenantCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-semibold text-text-secondary">Users</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{userCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-semibold text-text-secondary">Suspended</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{suspendedCount ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Create institution</h2>
            <p className="text-sm text-text-secondary">
              Create the institution, its code, and the first institution administrator.
            </p>
          </CardHeader>
          <CardContent>
            <form action={createInstitutionAction} className="grid gap-4 lg:grid-cols-3">
              <Input label="Institution name" name="name" placeholder="ICP Academy" required />
              <Input label="Slug" name="slug" placeholder="icp-academy" required />
              <Input label="Institution code" name="code" placeholder="ICP" maxLength={8} required />
              <Input label="Admin full name" name="adminName" placeholder="Institution Admin" required />
              <Input label="Admin email" name="adminEmail" type="email" placeholder="admin@institution.org" required />
              <Input label="Temporary password" name="adminPassword" type="password" minLength={8} required />
              <div className="lg:col-span-3">
                <Button type="submit">Create institution</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Institutions</h2>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(tenants ?? []).map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-5 py-4 font-semibold text-text-primary">{tenant.name}</td>
                    <td className="px-5 py-4 text-text-secondary">{tenant.code}</td>
                    <td className="px-5 py-4 text-text-secondary">{tenant.slug}</td>
                    <td className="px-5 py-4">
                      <Badge tone={tenant.status === "active" ? "green" : "amber"}>{tenant.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <form action={updateInstitutionStatusAction} className="inline-flex items-center gap-2">
                        <input name="tenantId" type="hidden" value={tenant.id} />
                        <input name="status" type="hidden" value={tenant.status === "active" ? "suspended" : "active"} />
                        <Button size="sm" type="submit" variant={tenant.status === "active" ? "secondary" : "primary"}>
                          {tenant.status === "active" ? "Suspend" : "Activate"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
