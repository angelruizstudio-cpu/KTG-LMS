import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { LinkButton } from "@/components/ui/link-button";
import { getSessionProfile } from "@/lib/auth";

export async function SiteHeader() {
  const { profile } = await getSessionProfile();

  return (
    <header className="border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3 font-semibold text-text-primary" href="/">
          <BrandLogo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-text-secondary md:flex">
          <a href="#features">Features</a>
          <a href="#roles">Roles</a>
          <a href="#courses">Courses</a>
        </nav>
        {profile ? (
          <LinkButton href="/dashboard" size="sm">
            Dashboard
          </LinkButton>
        ) : (
          <div className="flex items-center gap-2">
            <LinkButton href="/auth/login" variant="ghost" size="sm">
              Log in
            </LinkButton>
            <LinkButton href="/auth/register" size="sm">
              Start learning
            </LinkButton>
          </div>
        )}
      </div>
    </header>
  );
}
