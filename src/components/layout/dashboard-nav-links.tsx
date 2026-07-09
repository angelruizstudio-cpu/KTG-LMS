"use client";

import { BookOpen, CalendarRange, CreditCard, FileSpreadsheet, LayoutDashboard, Settings, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const iconMap = {
  book: BookOpen,
  calendar: CalendarRange,
  creditCard: CreditCard,
  dashboard: LayoutDashboard,
  reports: FileSpreadsheet,
  settings: Settings,
  trophy: Trophy,
  users: UsersRound
};

export type DashboardNavItem = {
  href: string;
  label: string;
  iconKey: keyof typeof iconMap;
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavLinks({ items, variant = "sidebar" }: { items: DashboardNavItem[]; variant?: "sidebar" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "bottom") {
    // Column count follows the number of items (capped at 6) so no item is hidden — an admin has
    // six nav entries and a fixed 3-column grid was silently dropping Settings on mobile.
    const gridColsClass =
      { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" }[
        Math.min(items.length, 6)
      ] ?? "grid-cols-4";

    return (
      <nav
        aria-label="Dashboard mobile navigation"
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-soft backdrop-blur lg:hidden print:hidden",
          gridColsClass
        )}
      >
        {items.slice(0, 6).map((item) => {
          const Icon = iconMap[item.iconKey];
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              aria-label={item.label}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[0.7rem] font-bold text-text-secondary transition hover:bg-secondary-light hover:text-text-primary",
                active && "bg-primary-light text-primary-hover"
              )}
              href={item.href}
              key={item.href}
            >
              <Icon size={20} />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="grid gap-1 p-4">
      {items.map((item) => {
        const Icon = iconMap[item.iconKey];
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-text-inverse opacity-80 transition hover:bg-sidebar-hover hover:text-text-inverse hover:opacity-100",
              active && "bg-sidebar-hover text-text-inverse opacity-100"
            )}
            href={item.href}
            key={item.href}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
