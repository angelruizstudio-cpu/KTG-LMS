import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary } from "@/lib/i18n";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { language, t } = await getDictionary();
  const copy = {
    en: {
      description: "Student, instructor, and institution admin accounts are created by each institution.",
      help:
        "Your institution will provide an ID like ",
      title: "Institution-managed access"
    },
    es: {
      description: "Las cuentas de estudiantes, instructores y administradores institucionales son creadas por cada institución.",
      help: "Tu institución te proveerá un ID como ",
      title: "Acceso administrado por la institución"
    }
  }[language];

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="premium-panel w-full max-w-md rounded-3xl border border-border p-8 shadow-soft">
        <Link className="mb-8 flex items-center gap-3 font-semibold text-text-primary" href="/">
          <BrandLogo />
        </Link>
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher currentPath="/auth/register" language={language} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{copy.title}</h1>
          <p className="mt-2 text-sm text-text-secondary">{copy.description}</p>
        </div>
        {params.error ? (
          <div className="mt-5 rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">
            {params.error}
          </div>
        ) : null}
        <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-text-secondary">
          {copy.help}
          <span className="font-mono font-semibold text-text-primary">DOSIS-000001</span>. {t.auth.loginDescription}
        </div>
        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link className="font-semibold text-primary-hover" href="/auth/login">
            {t.common.institutionLogin}
          </Link>
        </p>
      </div>
    </main>
  );
}
