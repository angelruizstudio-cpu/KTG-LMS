import Link from "next/link";

import { updatePasswordAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="premium-panel w-full max-w-md rounded-3xl border border-border p-8 shadow-soft">
        <Link className="mb-8 flex items-center gap-3 font-semibold text-text-primary" href="/">
          <BrandLogo />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-text-primary">Create new password</h1>
          <p className="mt-2 text-sm text-text-secondary">Choose a new password for your LMS account.</p>
        </div>

        {params.error ? (
          <div className="mt-5 rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">
            {params.error}
          </div>
        ) : null}

        {user ? (
          <form action={updatePasswordAction} className="mt-6 grid gap-4">
            <Input label="New password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Button type="submit" className="mt-2">
              Update password
            </Button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl border border-warning bg-warning-light px-3 py-3 text-sm text-warning">
            This reset session is missing or expired. Request a new password reset link.
          </div>
        )}

        <p className="mt-6 text-center text-sm">
          <Link className="font-semibold text-primary-hover" href="/auth/forgot-password">
            Request a new reset link
          </Link>
        </p>
      </div>
    </main>
  );
}
