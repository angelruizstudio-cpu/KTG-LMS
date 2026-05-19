import { ArrowRight, BookOpenCheck, ChartNoAxesCombined, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

const features = [
  {
    icon: BookOpenCheck,
    title: "Structured courses",
    description: "Build modules, lessons, quizzes, assignments, and certificate-ready learning paths."
  },
  {
    icon: UsersRound,
    title: "Role-based workspaces",
    description: "Admins, instructors, and students each get focused dashboards for their daily workflows."
  },
  {
    icon: ChartNoAxesCombined,
    title: "Progress and grades",
    description: "Track enrollments, lesson completion, quiz attempts, gradebook entries, and outcomes."
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    description: "Supabase Auth and Row Level Security policies keep tenant data access explicit."
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden bg-sidebar text-text-inverse">
        <div className="hero-glow absolute inset-0" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-sidebar-hover px-3 py-1 text-sm font-semibold text-accent backdrop-blur">
              <Sparkles size={16} />
              Modern LMS starter for teams that ship
            </div>
            <BrandLogo className="mb-5" imageClassName="h-16 w-16" inverse />
            <h1 className="text-5xl font-bold tracking-normal text-text-inverse sm:text-6xl">
              Dosis Educa
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-text-inverse opacity-80">
              A clean online learning platform with course authoring, enrollment, progress tracking,
              quizzes, gradebooks, certificates, payments, and secure role-based access.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/auth/register" size="lg">
                Create an account
                <ArrowRight size={18} />
              </LinkButton>
              <LinkButton href="/auth/login" variant="secondary" size="lg">
                Log in
              </LinkButton>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-border bg-sidebar-hover p-4 shadow-glow backdrop-blur">
            <div className="rounded-2xl bg-surface p-5 text-text-primary shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-secondary">Instructor Studio</p>
                  <h2 className="mt-1 text-2xl font-bold text-text-primary">Advanced Product Design</h2>
                </div>
                <span className="rounded-full bg-success-light px-3 py-1 text-sm font-semibold text-success">Live</span>
              </div>
              <div className="mt-6 grid gap-3">
                {["Research foundations", "Design systems", "Portfolio critique"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <span className="grid size-8 place-items-center rounded-xl bg-primary-light text-sm font-bold text-primary-hover">
                      {index + 1}
                    </span>
                    <span className="font-medium text-text-primary">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["82%", "Completion"],
                ["318", "Students"],
                ["94", "Avg grade"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-surface p-4 text-center shadow-soft">
                  <p className="text-2xl font-bold text-text-primary">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-text-primary">Everything needed for a version 1 LMS</h2>
          <p className="mt-3 text-text-secondary">
            The foundation covers learning content, roles, security, payments, and measurable learner outcomes.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent>
                <feature.icon className="text-secondary" size={24} />
                <h3 className="mt-5 font-semibold text-text-primary">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="roles" className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
          {[
            ["Admin", "Create instructors, manage users, assign programs, and grant course access."],
            ["Instructor", "Publish courses, add lessons, review enrolled students, and maintain gradebook records."],
            ["Student", "Access assigned program courses, complete lessons, submit work, take quizzes, and earn certificates."]
          ].map(([title, description]) => (
            <div key={title}>
              <h3 className="text-xl font-bold text-text-primary">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="courses" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="soft-gradient rounded-3xl border border-border px-6 py-10 shadow-blueglow sm:px-10">
          <h2 className="text-3xl font-bold">Ready for your first cohort?</h2>
          <p className="mt-3 max-w-2xl text-text-secondary">
            Connect Supabase, run the schema, add Stripe keys, and this starter is ready for real course workflows.
          </p>
          <LinkButton href="/auth/register" className="mt-7" size="lg">
            Build your academy
          </LinkButton>
        </div>
      </section>
    </main>
  );
}
