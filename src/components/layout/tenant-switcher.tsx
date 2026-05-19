import { Building2 } from "lucide-react";

import { switchTenantAction } from "@/app/dashboard/tenant-actions";
import type { UserRole } from "@/types/database";

type TenantMembership = {
  tenant_id: string;
  role: UserRole;
  tenants?: {
    name?: string | null;
    slug?: string | null;
  } | null;
};

export function TenantSwitcher({
  activeTenantId,
  memberships
}: {
  activeTenantId: string;
  memberships: TenantMembership[];
}) {
  if (memberships.length <= 1) {
    const tenantName = memberships[0]?.tenants?.name ?? "Dosis Educa";

    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
        <Building2 size={15} />
        <span className="truncate">{tenantName}</span>
      </div>
    );
  }

  return (
    <form action={switchTenantAction} className="grid gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-white/50" htmlFor="tenantId">
        Organization
      </label>
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/55" size={16} />
        <select
          className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-sidebar-hover py-2 pl-9 pr-3 text-sm font-semibold text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          defaultValue={activeTenantId}
          id="tenantId"
          name="tenantId"
        >
          {memberships.map((membership) => (
            <option key={membership.tenant_id} value={membership.tenant_id}>
              {membership.tenants?.name ?? membership.tenants?.slug ?? "Organization"} - {membership.role}
            </option>
          ))}
        </select>
      </div>
      <button
        className="h-9 rounded-xl bg-primary text-xs font-bold text-text-inverse shadow-glow transition hover:bg-primary-hover"
        type="submit"
      >
        Switch
      </button>
    </form>
  );
}
