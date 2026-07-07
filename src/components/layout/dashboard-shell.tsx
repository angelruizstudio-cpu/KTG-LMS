import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DashboardNavLinks } from "@/components/layout/dashboard-nav-links";
import type { DashboardNavItem } from "@/components/layout/dashboard-nav-links";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const navByRole: Record<UserRole, Array<{ href: string; labelKey: string; iconKey: DashboardNavItem["iconKey"] }>> = {
  admin: [
    { href: "/dashboard/admin", labelKey: "adminOverview", iconKey: "dashboard" },
    { href: "/dashboard/admin/users", labelKey: "users", iconKey: "users" },
    { href: "/dashboard/admin/programs", labelKey: "programs", iconKey: "book" },
    { href: "/dashboard/admin/courses", labelKey: "courses", iconKey: "book" },
    { href: "/dashboard/admin/finance", labelKey: "finance", iconKey: "creditCard" },
    { href: "/dashboard/admin/settings", labelKey: "settings", iconKey: "settings" }
  ],
  instructor: [
    { href: "/dashboard/instructor", labelKey: "instructorOverview", iconKey: "dashboard" },
    { href: "/dashboard/instructor/courses", labelKey: "courses", iconKey: "book" },
    { href: "/dashboard/instructor/gradebook", labelKey: "gradebook", iconKey: "trophy" }
  ],
  student: [
    { href: "/dashboard/student", labelKey: "myLearning", iconKey: "dashboard" },
    { href: "/dashboard/student/catalog", labelKey: "programCourses", iconKey: "book" },
    { href: "/dashboard/student/certificates", labelKey: "certificates", iconKey: "trophy" }
  ]
};

function navLabel(labelKey: string, t: Awaited<ReturnType<typeof getDictionary>>["t"]) {
  const dashboardValue = t.dashboard[labelKey as keyof typeof t.dashboard];
  if (typeof dashboardValue === "string") {
    return dashboardValue;
  }

  return t.common[labelKey as keyof typeof t.common] ?? labelKey;
}

function roleLabel(role: UserRole, t: Awaited<ReturnType<typeof getDictionary>>["t"]) {
  const roleLabels = {
    admin: t.dashboard.profileRoleAdmin,
    instructor: t.dashboard.profileRoleInstructor,
    student: t.dashboard.profileRoleStudent
  };

  return roleLabels[role];
}

export async function DashboardShell({
  children,
  memberships,
  profile
}: {
  children: ReactNode;
  memberships: Array<{
    tenant_id: string;
    role: UserRole;
    tenants?: { name?: string | null; slug?: string | null } | null;
  }>;
  profile: { full_name: string; email: string; role: UserRole; default_tenant_id: string };
}) {
  const nav = navByRole[profile.role];
  const { language, t } = await getDictionary();
  const navItems = nav.map((item) => ({
    href: item.href,
    iconKey: item.iconKey,
    label: navLabel(item.labelKey, t)
  }));

  return (
    <div className="min-h-screen bg-background print:bg-surface">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 bg-sidebar text-text-inverse shadow-soft print:hidden lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <BrandLogo inverse />
        </div>
        <div className="border-b border-white/10 p-4">
          <TenantSwitcher activeTenantId={profile.default_tenant_id} memberships={memberships} />
        </div>
        <DashboardNavLinks items={navItems} />
      </aside>
      <div className="print:pl-0 lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur print:hidden">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link className="flex items-center gap-3 font-semibold text-text-primary lg:hidden" href="/dashboard">
              <BrandLogo />
            </Link>
            <div className="ml-auto flex items-center gap-4">
              <LanguageSwitcher currentPath="/dashboard" language={language} />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-text-primary">{profile.full_name}</p>
                <p className="text-xs capitalize text-text-secondary">{roleLabel(profile.role, t)}</p>
              </div>
              <div className="grid size-10 place-items-center rounded-full bg-primary-light text-sm font-bold text-primary-hover">
                {initials(profile.full_name || profile.email)}
              </div>
              <form action={signOutAction}>
                <Button aria-label={t.common.signOut} size="sm" type="submit" variant="ghost">
                  <LogOut size={18} />
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="px-4 pb-28 pt-8 print:p-0 sm:px-6 lg:px-8 lg:pb-8">{children}</main>
      </div>
      <DashboardNavLinks items={navItems} variant="bottom" />
    </div>
  );
}
