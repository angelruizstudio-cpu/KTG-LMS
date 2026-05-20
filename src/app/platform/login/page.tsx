import Link from "next/link";

import { platformLoginAction } from "@/app/platform/actions";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function PlatformLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="premium-panel w-full max-w-md rounded-3xl border border-border p-8 shadow-soft">
        <Link className="mb-8 flex items-center gap-3 font-semibold text-text-primary" href="/">
          <BrandLogo />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Platform admin</h1>
          <p className="mt-2 text-sm text-text-secondary">Manage LMS institutions, platform access, and global setup.</p>
        </div>
        {params.error ? (
          <div className="mt-5 rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">
            {params.error}
          </div>
        ) : null}
        <form action={platformLoginAction} className="mt-6 grid gap-4">
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          <Input label="Password" name="password" type="password" autoComplete="current-password" required />
          <Button type="submit" className="mt-2">
            Open platform portal
          </Button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link className="font-semibold text-primary-hover" href="/auth/forgot-password?accountType=platform">
            Forgot your password?
          </Link>
        </p>
        <p className="mt-6 text-center text-sm">
          <Link className="font-semibold text-primary-hover" href="/auth/login">
            Institution login
          </Link>
        </p>
      </div>
    </main>
  );
}
