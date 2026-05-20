import { ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { InstitutionAccess, OpenInstitutionSearchButton } from "@/components/institution-access";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LinkButton } from "@/components/ui/link-button";
import { getDictionary } from "@/lib/i18n";

export default async function HomePage() {
  const { language, t } = await getDictionary();

  return (
    <main className="min-h-screen bg-sidebar text-text-inverse">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link className="flex items-center gap-3" href="/">
            <BrandLogo inverse />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-text-inverse/85 md:flex">
            <Link className="transition hover:text-accent" href="/about">
              {t.home.navAbout}
            </Link>
            <Link className="transition hover:text-accent" href="/auth/login">
              {t.home.institutionLogin}
            </Link>
            <Link className="transition hover:text-accent" href="/platform/login">
              {t.common.platformAdmin}
            </Link>
            <Link className="transition hover:text-accent" href="/auth/register">
              {t.home.accessHelp}
            </Link>
            <LanguageSwitcher currentPath="/" language={language} variant="dark" />
          </nav>
        </div>
      </header>

      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-sidebar" />
        <div className="absolute -left-24 top-0 size-[34rem] rounded-full bg-primary/25 blur-[110px]" />
        <div className="absolute -right-20 top-0 size-[32rem] rounded-full bg-secondary/25 blur-[115px]" />
        <div className="absolute bottom-0 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-mauve/25 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_55%)]" />

        <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-5 pb-12 pt-28 sm:px-8 lg:grid-cols-[1fr_0.96fr]">
          <div className="mx-auto w-full max-w-[620px] lg:mx-0">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent/70 bg-sidebar-hover/70 px-4 py-2 text-sm font-bold text-accent shadow-soft backdrop-blur">
              <Sparkles size={16} />
              {t.home.badge}
            </div>

            <BrandLogo className="mb-8" imageClassName="h-12 w-12" inverse />
            <h1 className="text-6xl font-black leading-none text-text-inverse sm:text-7xl">{t.home.headline}</h1>
            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-text-inverse/78">{t.home.subtitle}</p>

            <div className="mt-9 grid max-w-[460px] gap-4">
              <OpenInstitutionSearchButton label={t.home.searchButton} />
              <LinkButton
                className="h-14 rounded-full border-white/70 bg-surface text-base hover:border-accent hover:bg-secondary-light"
                href="/platform/login"
                size="lg"
                variant="secondary"
              >
                <ShieldCheck size={20} />
                {t.home.adminButton}
              </LinkButton>
              <div className="md:hidden">
                <LanguageSwitcher currentPath="/" language={language} variant="dark" />
              </div>
            </div>
          </div>

          <InstitutionAccess copy={t.institutionAccess} />
        </div>
      </section>
    </main>
  );
}
