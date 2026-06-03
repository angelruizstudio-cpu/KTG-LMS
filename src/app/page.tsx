import { BookOpenCheck, Landmark, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";

import { AiChatWidget } from "@/components/ai-chat-widget";
import { BrandLogo } from "@/components/brand-logo";
import { InstitutionAccess, OpenInstitutionSearchButton } from "@/components/institution-access";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LinkButton } from "@/components/ui/link-button";
import { getDictionary } from "@/lib/i18n";

export default async function HomePage() {
  const { language, t } = await getDictionary();
  const proofItems = [
    { icon: BookOpenCheck, label: t.home.proofCourses },
    { icon: Landmark, label: t.home.proofTenant },
    { icon: Trophy, label: t.home.proofFinance }
  ];

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link className="flex items-center gap-3" href="/">
            <BrandLogo imageClassName="h-11 w-11" markClassName="size-12 rounded-3xl" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-text-secondary md:flex">
            <Link className="transition hover:text-primary-hover" href="/about">
              {t.home.navAbout}
            </Link>
            <Link className="transition hover:text-primary-hover" href="/request-demo">
              {t.home.requestDemo}
            </Link>
            <OpenInstitutionSearchButton
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-text-inverse shadow-glow transition hover:bg-primary-hover"
              label={t.home.searchButton}
            />
            <LanguageSwitcher currentPath="/" language={language} variant="light" />
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-surface">
        <div className="absolute inset-0 hero-glow opacity-80" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-background" />

        <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[0.92fr_1fr]">
          <div className="mx-auto w-full max-w-[620px] lg:mx-0">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary-light bg-primary-light/70 px-4 py-2 text-sm font-bold text-primary-hover shadow-soft backdrop-blur">
              <Sparkles size={16} />
              {t.home.badge}
            </div>

            <BrandLogo className="mb-8" imageClassName="h-20 w-20" markClassName="size-24 rounded-[2rem]" />
            <h1 className="text-6xl font-black leading-none text-text-primary sm:text-7xl">{t.home.headline}</h1>
            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-text-secondary">{t.home.subtitle}</p>

            <div className="mt-9 grid max-w-[460px] gap-4 sm:grid-cols-2">
              <OpenInstitutionSearchButton label={t.home.searchButton} />
              <LinkButton
                className="h-14 rounded-full border-white/70 bg-surface text-base hover:border-accent hover:bg-secondary-light"
                href="/request-demo"
                size="lg"
                variant="secondary"
              >
                <Sparkles size={20} />
                {t.home.requestDemo}
              </LinkButton>
              <div className="sm:col-span-2 md:hidden">
                <LanguageSwitcher currentPath="/" language={language} variant="light" />
              </div>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {proofItems.map(({ icon: Icon, label }) => (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface/85 px-4 py-3 text-sm font-bold text-text-primary shadow-sm" key={label}>
                  <Icon className="text-secondary" size={18} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <InstitutionAccess copy={t.institutionAccess} />
        </div>
      </section>

      <section className="bg-background px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-primary-hover">{t.home.sectionEyebrow}</p>
            <h2 className="mt-3 text-4xl font-black leading-tight text-text-primary">{t.home.sectionTitle}</h2>
            <p className="mt-5 text-base font-medium leading-8 text-text-secondary">{t.home.sectionText}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              [t.institutionAccess.previewItems[0], t.home.learnerCardText],
              [t.institutionAccess.previewItems[1], t.home.sectionText],
              [t.institutionAccess.previewItems[2], t.home.learnerCardTitle]
            ].map(([title, text]) => (
              <article className="rounded-3xl border border-border bg-surface p-6 shadow-soft" key={title}>
                <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary-light text-primary-hover">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-lg font-black text-text-primary">{title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-text-secondary">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <AiChatWidget sourcePage="home" />
    </main>
  );
}
