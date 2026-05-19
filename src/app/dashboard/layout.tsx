import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id,role,tenants(name,slug)")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .order("created_at");
  const tenantMemberships = (memberships ?? []).map((membership) => ({
    tenant_id: membership.tenant_id,
    role: membership.role,
    tenants: Array.isArray(membership.tenants) ? membership.tenants[0] : membership.tenants
  }));

  return (
    <DashboardShell memberships={tenantMemberships} profile={profile}>
      {children}
    </DashboardShell>
  );
}
