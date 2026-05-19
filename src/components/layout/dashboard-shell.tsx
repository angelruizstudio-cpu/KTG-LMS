import { BookOpen, LayoutDashboard, LogOut, Settings, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const navByRole: Record<UserRole, Array<{ href: string; label: string; icon: typeof LayoutDashboard }>> = {
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "Users", icon: UsersRound },
    { href: "/dashboard/admin/programs", label: "Programs", icon: BookOpen },
    { href: "/dashboard/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/dashboard/admin/settings", label: "Settings", icon: Settings }
  ],
  instructor: [
    { href: "/dashboard/instructor", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/instructor/courses", label: "Courses", icon: BookOpen },
    { href: "/dashboard/instructor/gradebook", label: "Gradebook", icon: Trophy }
  ],
  student: [
    { href: "/dashboard/student", label: "My learning", icon: LayoutDashboard },
    { href: "/dashboard/student/catalog", label: "Program courses", icon: BookOpen },
    { href: "/dashboard/student/certificates", label: "Certificates", icon: Trophy }
  ]
};

export function DashboardShell({
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

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 bg-sidebar text-text-inverse shadow-soft lg:block">
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
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link className="flex items-center gap-3 font-semibold text-text-primary lg:hidden" href="/dashboard">
              <BrandLogo />
            </Link>
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-text-primary">{profile.full_name}</p>
                <p className="text-xs capitalize text-text-secondary">{profile.role}</p>
              </div>
              <div className="grid size-10 place-items-center rounded-full bg-primary-light text-sm font-bold text-primary-hover">
                {initials(profile.full_name || profile.email)}
              </div>
              <form action={signOutAction}>
                <Button aria-label="Sign out" size="sm" type="submit" variant="ghost">
                  <LogOut size={18} />
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
