import Link from "next/link";

import { requestPasswordResetAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDictionary } from "@/lib/i18n";

export default async function PlatformForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const { language, t } = await getDictionary();

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="premium-panel w-full max-w-md rounded-3xl border border-border p-8 shadow-soft">
        <Link className="mb-8 flex items-center gap-3 font-semibold text-text-primary" href="/">
          <BrandLogo />
        </Link>
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher currentPath="/platform/forgot-password" language={language} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t.auth.resetPassword}</h1>
          <p className="mt-2 text-sm text-text-secondary">{t.auth.platformAdminsDescription}</p>
        </div>

        {params.error ? (
          <div className="mt-5 rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">
            {params.error}
          </div>
        ) : null}
        {params.sent ? (
          <div className="mt-5 rounded-xl border border-success bg-success-light px-3 py-2 text-sm text-success">
            {t.auth.resetSent}
          </div>
        ) : null}

        <form action={requestPasswordResetAction} className="mt-6 grid gap-4 rounded-2xl border border-border bg-surface p-5">
          <input name="accountType" type="hidden" value="platform" />
          <div>
            <h2 className="font-semibold text-text-primary">{t.auth.platformAdmins}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t.auth.platformDescription}</p>
          </div>
          <Input label={t.auth.email} name="email" type="email" autoComplete="email" placeholder="admin@example.com" required />
          <Button type="submit" variant="secondary">
            {t.auth.sendResetLink}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link className="font-semibold text-primary-hover" href="/platform/login">
            {t.common.backToPlatformLogin}
          </Link>
        </p>
      </div>
    </main>
  );
}
