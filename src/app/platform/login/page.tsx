import Link from "next/link";

import { platformLoginAction } from "@/app/platform/actions";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDictionary } from "@/lib/i18n";

export default async function PlatformLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
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
          <LanguageSwitcher currentPath="/platform/login" language={language} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t.common.platformAdmin}</h1>
          <p className="mt-2 text-sm text-text-secondary">{t.auth.platformDescription}</p>
        </div>
        {params.error ? (
          <div className="mt-5 rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">
            {params.error}
          </div>
        ) : null}
        <form action={platformLoginAction} className="mt-6 grid gap-4">
          <Input label={t.auth.email} name="email" type="email" autoComplete="email" required />
          <Input label={t.auth.password} name="password" type="password" autoComplete="current-password" required />
          <Button type="submit" className="mt-2">
            {t.common.platformAdmin}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link className="font-semibold text-primary-hover" href="/auth/forgot-password?accountType=platform">
            {t.common.forgotPassword}
          </Link>
        </p>
        <p className="mt-6 text-center text-sm">
          <Link className="font-semibold text-primary-hover" href="/auth/login">
            {t.common.institutionLogin}
          </Link>
        </p>
      </div>
    </main>
  );
}
