import { ArrowRight, Building2, GraduationCap, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { LinkButton } from "@/components/ui/link-button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface text-text-primary">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="relative size-12 overflow-hidden rounded-2xl bg-surface shadow-glow">
              <Image alt="Dosis Educa" className="object-contain p-1" fill priority src="/brand/dosis-educa.png" />
            </span>
            <span className="text-2xl font-black tracking-normal text-text-primary">
              Dosis Educa<span className="text-primary">.</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-text-primary md:flex">
            <Link className="hover:text-primary-hover" href="/auth/login">
              Institution Login
            </Link>
            <Link className="hover:text-primary-hover" href="/platform/login">
              Platform Admin
            </Link>
            <Link className="hover:text-primary-hover" href="/auth/register">
              Access Help
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-background">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="mx-auto w-full max-w-[520px] lg:mx-0">
            <div className="mb-10 flex items-center justify-center gap-7 lg:justify-start">
              <span className="relative size-24 overflow-hidden rounded-3xl bg-surface shadow-glow">
                <Image alt="Dosis Educa" className="object-contain p-2" fill priority src="/brand/dosis-educa.png" />
              </span>
              <div>
                <h1 className="text-5xl font-black leading-none text-text-primary sm:text-7xl">Dosis Educa</h1>
                <p className="mt-3 text-xl font-semibold text-text-secondary">By Dosis de Esperanza</p>
              </div>
            </div>

            <div className="max-w-[420px]">
              <h2 className="text-xl font-bold text-text-primary">Account Login</h2>
              <div className="mt-8 grid gap-5">
                <LinkButton className="h-14 rounded-full bg-sidebar text-base hover:bg-sidebar-hover" href="/auth/login" size="lg">
                  <GraduationCap size={20} />
                  Students and Educators
                </LinkButton>
                <LinkButton className="h-14 rounded-full text-base" href="/platform/login" size="lg" variant="secondary">
                  <ShieldCheck size={20} />
                  Platform Administrator
                </LinkButton>
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] bg-secondary p-8 text-text-inverse shadow-blueglow sm:p-10 lg:ml-auto lg:w-[520px]">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-secondary-hover">
                <Building2 size={24} />
              </span>
              <div>
                <h2 className="text-3xl font-black leading-tight text-text-inverse">Students and Educators</h2>
                <p className="mt-4 text-base font-medium leading-7 text-text-inverse/90">
                  If your institution uses Dosis Educa, enter the institution ID issued by your school to access your
                  login page.
                </p>
              </div>
            </div>

            <form action="/auth/login" className="mt-8 grid gap-3" method="get">
              <label className="text-sm font-bold text-text-inverse" htmlFor="institutionUserId">
                Institution ID
              </label>
              <input
                className="h-14 rounded-xl border border-white/20 bg-surface px-4 font-mono text-base font-semibold uppercase text-text-primary outline-none shadow-soft transition placeholder:font-sans placeholder:normal-case placeholder:text-text-secondary/70 focus:border-accent focus:ring-4 focus:ring-accent/30"
                id="institutionUserId"
                name="institutionUserId"
                placeholder="DOSIS-000001"
              />
              <button
                className="mt-3 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-text-inverse shadow-glow transition hover:bg-primary-hover"
                type="submit"
              >
                Continue to login
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm leading-6 text-text-inverse/90">
              Your ID connects you directly to your institution. You do not need to choose a school every time you log in.
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-text-secondary sm:px-8 md:flex-row md:items-center md:justify-between">
          <BrandLogo />
          <p>Secure academic access for institution-managed learning.</p>
        </div>
      </footer>
    </main>
  );
}
