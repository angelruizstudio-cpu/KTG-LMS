import { BookOpen, CreditCard, LayoutDashboard, LogOut, Settings, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { cn, initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const navByRole: Record<UserRole, Array<{ href: string; labelKey: string; icon: typeof LayoutDashboard }>> = {
  admin: [
    { href: "/dashboard/admin", labelKey: "adminOverview", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", labelKey: "users", icon: UsersRound },
    { href: "/dashboard/admin/programs", labelKey: "programs", icon: BookOpen },
    { href: "/dashboard/admin/courses", labelKey: "courses", icon: BookOpen },
    { href: "/dashboard/admin/finance", labelKey: "finance", icon: CreditCard },
    { href: "/dashboard/admin/settings", labelKey: "settings", icon: Settings }
  ],
  instructor: [
    { href: "/dashboard/instructor", labelKey: "instructorOverview", icon: LayoutDashboard },
    { href: "/dashboard/instructor/courses", labelKey: "courses", icon: BookOpen },
    { href: "/dashboard/instructor/gradebook", labelKey: "gradebook", icon: Trophy }
  ],
  student: [
    { href: "/dashboard/student", labelKey: "myLearning", icon: LayoutDashboard },
    { href: "/dashboard/student/catalog", labelKey: "programCourses", icon: BookOpen },
    { href: "/dashboard/student/certificates", labelKey: "certificates", icon: Trophy }
  ]
};

function navLabel(labelKey: string, t: Awaited<ReturnType<typeof getDictionary>>["t"]) {
  if (labelKey in t.dashboard) {
    return t.dashboard[labelKey as keyof typeof t.dashboard];
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

  return (
    <div className="min-h-screen bg-background print:bg-surface">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 bg-sidebar text-text-inverse shadow-soft print:hidden lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <BrandLogo inverse />
        </div>
        <div className="border-b border-white/10 p-4">
          <TenantSwitcher activeTenantId={profile.default_tenant_id} memberships={memberships} />
        </div>
        <nav className="grid gap-1 p-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-text-inverse opacity-80 transition hover:bg-sidebar-hover hover:text-text-inverse hover:opacity-100"
              )}
              href={item.href as never}
            >
              <item.icon size={18} />
              {navLabel(item.labelKey, t)}
            </Link>
          ))}
        </nav>
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
        <main className="px-4 py-8 print:p-0 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
