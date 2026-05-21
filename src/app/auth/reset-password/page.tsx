import Link from "next/link";

import { updatePasswordAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDictionary } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { language, t } = await getDictionary();
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
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher currentPath="/auth/reset-password" language={language} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t.auth.createNewPassword}</h1>
          <p className="mt-2 text-sm text-text-secondary">{t.auth.forgotDescription}</p>
        </div>

        {params.error ? (
          <div className="mt-5 rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">
            {params.error}
          </div>
        ) : null}

        {user ? (
          <form action={updatePasswordAction} className="mt-6 grid gap-4">
            <Input label={t.auth.newPassword} name="password" type="password" autoComplete="new-password" minLength={8} required />
            <Input
              label={t.auth.confirmPassword}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Button type="submit" className="mt-2">
              {t.auth.updatePassword}
            </Button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl border border-warning bg-warning-light px-3 py-3 text-sm text-warning">
            {t.auth.resetExpired}
          </div>
        )}

        <p className="mt-6 text-center text-sm">
          <Link className="font-semibold text-primary-hover" href="/auth/forgot-password?accountType=institution">
            {t.auth.requestNewLink}
          </Link>
        </p>
      </div>
    </main>
  );
}
