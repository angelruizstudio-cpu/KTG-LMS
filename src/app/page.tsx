import { ArrowRight, Building2, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { LinkButton } from "@/components/ui/link-button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-sidebar text-text-inverse">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link className="flex items-center gap-3" href="/">
            <BrandLogo inverse />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-text-inverse/85 md:flex">
            <Link className="transition hover:text-accent" href="/auth/login">
              Institution Login
            </Link>
            <Link className="transition hover:text-accent" href="/platform/login">
              Platform Admin
            </Link>
            <Link className="transition hover:text-accent" href="/auth/register">
              Access Help
            </Link>
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
              Institution-managed learning portal
            </div>

            <BrandLogo className="mb-8" imageClassName="h-12 w-12" inverse />
            <h1 className="text-6xl font-black leading-none text-text-inverse sm:text-7xl">Dosis Educa</h1>
            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-text-inverse/78">
              Access your assigned courses, programs, grades, and certificates through the institution ID issued by your
              school.
            </p>

            <div className="mt-9 grid max-w-[460px] gap-4">
              <LinkButton className="h-14 rounded-full bg-primary text-base hover:bg-primary-hover" href="/auth/login" size="lg">
                <GraduationCap size={20} />
                Students and Educators
                <ArrowRight size={18} />
              </LinkButton>
              <LinkButton
                className="h-14 rounded-full border-white/70 bg-surface text-base hover:border-accent hover:bg-secondary-light"
                href="/platform/login"
                size="lg"
                variant="secondary"
              >
                <ShieldCheck size={20} />
                Platform Administrator
              </LinkButton>
            </div>
          </div>

          <div className="grid gap-5 lg:ml-auto lg:w-[560px]">
            <aside className="rounded-[2rem] border border-white/20 bg-secondary p-7 text-text-inverse shadow-blueglow sm:p-9">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-secondary-hover">
                  <Building2 size={24} />
                </span>
                <div>
                  <h2 className="text-3xl font-black leading-tight text-text-inverse">Students and Educators</h2>
                  <p className="mt-4 text-base font-medium leading-7 text-text-inverse/90">
                    Enter your institution ID to continue directly to your assigned school portal.
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
            </aside>

            <div className="rounded-[2rem] border border-white/45 bg-white/10 p-4 shadow-glow backdrop-blur">
              <div className="rounded-3xl bg-surface p-5 text-text-primary shadow-soft">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-text-secondary">Student Portal</p>
                    <h2 className="mt-1 text-2xl font-black text-text-primary">Program Dashboard</h2>
                  </div>
                  <span className="rounded-full bg-success-light px-3 py-1 text-sm font-bold text-success">Live</span>
                </div>
                <div className="mt-6 grid gap-3">
                  {["Program courses", "Prerequisite access", "Finance clearance"].map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <span className="grid size-8 place-items-center rounded-xl bg-primary-light text-sm font-black text-primary-hover">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-text-primary">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["ID", "Login"],
                  ["RLS", "Secure"],
                  ["100%", "Tenant"]
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl bg-surface p-4 text-center shadow-soft">
                    <p className="text-2xl font-black text-text-primary">{value}</p>
                    <p className="mt-1 text-xs font-bold uppercase text-text-secondary">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
