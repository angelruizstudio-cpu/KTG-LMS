import Link from "next/link";

import { loginAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDictionary } from "@/lib/i18n";
import { sanitizeBannerMessage } from "@/lib/utils";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; institutionName?: string; institutionUserId?: string; message?: string; next?: string }>;
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
          <LanguageSwitcher currentPath="/auth/login" language={language} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {params.institutionName ? `${params.institutionName} ${t.auth.login.toLowerCase()}` : t.common.institutionLogin}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">{t.auth.loginDescription}</p>
        </div>
        {params.error ? (
          <Alert variant="error" className="mt-5">
            {sanitizeBannerMessage(params.error)}
          </Alert>
        ) : null}
        {params.message ? (
          <Alert variant="success" className="mt-5">
            {sanitizeBannerMessage(params.message)}
          </Alert>
        ) : null}
        <form action={loginAction} className="mt-6 grid gap-4">
          <input name="next" type="hidden" value={params.next ?? "/dashboard"} />
          <Input
            label={t.auth.institutionId}
            name="institutionUserId"
            placeholder="DOSIS-000001"
            autoCapitalize="characters"
            autoComplete="username"
            defaultValue={params.institutionUserId ?? ""}
            required
          />
          <Input label={t.auth.password} name="password" type="password" autoComplete="current-password" required />
          <SubmitButton className="mt-2" pendingLabel={`${t.auth.login}…`}>
            {t.auth.login}
          </SubmitButton>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link className="font-semibold text-primary-hover" href="/auth/forgot-password?accountType=institution">
            {t.common.forgotPassword}
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-text-secondary">{t.auth.needAccess}</p>
        <p className="mt-3 text-center text-sm">
          <Link className="font-semibold text-primary-hover" href="/platform/login">
            {t.common.platformAdmin}
          </Link>
        </p>
      </div>
    </main>
  );
}
