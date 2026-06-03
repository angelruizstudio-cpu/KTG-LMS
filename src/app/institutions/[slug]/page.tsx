import { ArrowLeft, BookOpen, GraduationCap, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiChatWidget } from "@/components/ai-chat-widget";
import { BrandLogo } from "@/components/brand-logo";
import { LinkButton } from "@/components/ui/link-button";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export default async function InstitutionLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: institution } = await supabase
    .from("tenants")
    .select("name,slug,code,status")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!institution) {
    notFound();
  }

  const loginUrl = `/auth/login?institution=${encodeURIComponent(institution.slug)}&institutionName=${encodeURIComponent(institution.name)}`;

  return (
    <main className="min-h-screen bg-background">
      <section className="relative min-h-screen overflow-hidden bg-sidebar text-text-inverse">
        <div className="absolute inset-0 bg-sidebar" />
        <div className="absolute -left-24 top-0 size-[34rem] rounded-full bg-primary/25 blur-[110px]" />
        <div className="absolute -right-20 top-0 size-[32rem] rounded-full bg-secondary/25 blur-[115px]" />
        <div className="absolute bottom-0 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-mauve/25 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8">
          <header className="flex items-center justify-between">
            <Link className="flex items-center gap-3" href="/">
              <BrandLogo inverse />
            </Link>
            <Link className="hidden text-sm font-semibold text-text-inverse/80 hover:text-accent sm:inline-flex" href="/">
              <ArrowLeft size={16} />
              Main LMS site
            </Link>
          </header>

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent/70 bg-sidebar-hover/70 px-4 py-2 text-sm font-bold text-accent shadow-soft backdrop-blur">
                <Sparkles size={16} />
                Institution learning portal
              </div>
              <p className="text-sm font-bold uppercase tracking-wide text-accent">{institution.code}</p>
              <h1 className="mt-4 text-5xl font-black leading-tight text-text-inverse sm:text-6xl">{institution.name}</h1>
              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-text-inverse/78">
                Access your assigned courses, program progress, grades, and certificates through your institution-issued ID.
              </p>

              <div className="mt-9 grid max-w-[460px] gap-4 sm:grid-cols-2">
                <LinkButton className="h-14 rounded-full text-base" href={loginUrl} size="lg" variant="primary">
                  <GraduationCap size={20} />
                  Student login
                </LinkButton>
                <LinkButton
                  className="h-14 rounded-full border-white/70 bg-surface text-base hover:border-accent hover:bg-secondary-light"
                  href="/request-demo"
                  size="lg"
                  variant="secondary"
                >
                  <BookOpen size={20} />
                  Request info
                </LinkButton>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/45 bg-white/10 p-4 shadow-glow backdrop-blur">
              <div className="rounded-3xl bg-surface p-6 text-text-primary shadow-soft">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-text-secondary">Secure access</p>
                    <h2 className="mt-1 text-2xl font-black text-text-primary">Institution ID Login</h2>
                  </div>
                  <span className="rounded-full bg-success-light px-3 py-1 text-sm font-bold text-success">Active</span>
                </div>
                <div className="mt-6 grid gap-3">
                  {[
                    ["Assigned program courses", GraduationCap],
                    ["Prerequisite-based access", LockKeyhole],
                    ["Verified certificates", ShieldCheck]
                  ].map(([label, Icon]) => (
                    <div key={String(label)} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-primary-light text-primary-hover">
                        <Icon size={20} />
                      </span>
                      <span className="font-semibold text-text-primary">{String(label)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <AiChatWidget sourcePage={`institution:${institution.slug}`} />
    </main>
  );
}
