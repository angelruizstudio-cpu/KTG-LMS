import { ArrowLeft, Bot, Mail, Plus, RotateCcw, UsersRound } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

import { addProspectInteractionAction, createProspectAction, reanalyzeProspectAction, updateProspectStatusAction } from "./actions";

const statusOptions = [
  "new",
  "contacted",
  "demo_scheduled",
  "demo_completed",
  "proposal_sent",
  "negotiation",
  "won",
  "lost"
];

const institutionTypes = [
  ["church", "Church"],
  ["bible_institute", "Bible institute"],
  ["seminary", "Seminary"],
  ["school", "School"],
  ["ministry", "Ministry"],
  ["nonprofit", "Nonprofit"],
  ["other", "Other"]
];

function priorityTone(priority?: string | null): "green" | "amber" | "pink" | "slate" {
  if (priority === "high") {
    return "pink";
  }

  if (priority === "medium") {
    return "amber";
  }

  if (priority === "low") {
    return "green";
  }

  return "slate";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default async function PlatformProspectsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
}) {
  const params = await searchParams;
  await requirePlatformAdmin();
  const supabase = createSupabaseAdminClient();

  const [{ data: prospects, error }, { count: totalCount }, { count: highPriorityCount }, { count: wonCount }] = await Promise.all([
    supabase
      .from("institution_prospects")
      .select(
        "id,institution_name,institution_type,contact_name,email,phone,estimated_students,programs_needed,status,ai_score,ai_priority,ai_summary,ai_next_action,ai_email_draft,source,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("institution_prospects").select("*", { count: "exact", head: true }),
    supabase.from("institution_prospects").select("*", { count: "exact", head: true }).eq("ai_priority", "high"),
    supabase.from("institution_prospects").select("*", { count: "exact", head: true }).eq("status", "won")
  ]);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo />
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold text-text-secondary hover:text-primary-hover" href="/platform">
              Platform portal
            </Link>
            <form action={signOutAction}>
              <Button size="sm" type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-primary-hover" href="/platform">
              <ArrowLeft size={16} />
              Back to platform
            </Link>
            <p className="text-sm font-bold uppercase tracking-wide text-primary-hover">AI sales pipeline</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Institution prospects</h1>
            <p className="mt-2 max-w-3xl text-text-secondary">
              Track institutions interested in subscribing to the LMS, qualify opportunities, and prepare follow-up from one portal.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text-primary shadow-sm hover:border-secondary hover:bg-secondary-light"
            href="/request-demo"
          >
            <Mail size={18} />
            Public request form
          </Link>
        </div>

        {params.error ? (
          <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm font-semibold text-error">{params.error}</div>
        ) : null}
        {params.created ? (
          <div className="rounded-xl border border-success bg-success-light px-3 py-2 text-sm font-semibold text-success">
            Prospect created and analyzed.
          </div>
        ) : null}
        {params.updated ? (
          <div className="rounded-xl border border-secondary bg-secondary-light px-3 py-2 text-sm font-semibold text-secondary-hover">
            Prospect updated.
          </div>
        ) : null}
        {error ? <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">{error.message}</div> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-secondary">Prospects</p>
                <p className="mt-2 text-3xl font-bold text-text-primary">{totalCount ?? 0}</p>
              </div>
              <UsersRound className="text-secondary" size={30} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-secondary">High priority</p>
                <p className="mt-2 text-3xl font-bold text-text-primary">{highPriorityCount ?? 0}</p>
              </div>
              <Bot className="text-primary" size={30} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-secondary">Converted</p>
                <p className="mt-2 text-3xl font-bold text-text-primary">{wonCount ?? 0}</p>
              </div>
              <Plus className="text-success" size={30} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Create prospect</h2>
            <p className="text-sm text-text-secondary">Use this for referrals, calls, events, or manual sales leads.</p>
          </CardHeader>
          <CardContent>
            <form action={createProspectAction} className="grid gap-4 lg:grid-cols-4">
              <Input label="Institution name" name="institutionName" placeholder="Northbridge Seminary" required />
              <label className="grid gap-2 text-sm font-medium text-text-secondary">
                Type
                <select className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary-light" name="institutionType">
                  {institutionTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Contact name" name="contactName" placeholder="Angel Ruiz" required />
              <Input label="Email" name="email" placeholder="admin@institution.org" required type="email" />
              <Input label="Phone" name="phone" />
              <Input label="Country" name="country" placeholder="Puerto Rico" />
              <Input label="City" name="city" placeholder="San Juan" />
              <Input label="Students" min={0} name="estimatedStudents" placeholder="125" type="number" />
              <Input label="Source" name="source" placeholder="referral, event, website" />
              <Textarea className="lg:col-span-2" label="Programs needed" name="programsNeeded" />
              <Textarea className="lg:col-span-2" label="Challenges" name="painPoints" />
              <div className="lg:col-span-4">
                <Button type="submit">Create and analyze</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {(prospects ?? []).map((prospect) => (
            <Card key={prospect.id}>
              <CardContent className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-text-primary">{prospect.institution_name}</h2>
                    <Badge tone={priorityTone(prospect.ai_priority)}>{prospect.ai_priority ?? "low"} priority</Badge>
                    <Badge tone="blue">score {prospect.ai_score ?? 0}</Badge>
                    <Badge>{statusLabel(prospect.status)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {prospect.contact_name} · {prospect.email}
                    {prospect.phone ? ` · ${prospect.phone}` : ""}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-text-secondary">{prospect.ai_summary ?? "No AI summary yet."}</p>
                  <div className="mt-4 rounded-xl border border-primary-light bg-primary-light/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary-hover">Recommended next action</p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">{prospect.ai_next_action ?? "Add details and re-analyze this prospect."}</p>
                  </div>
                  {prospect.ai_email_draft ? (
                    <details className="mt-4 rounded-xl border border-border bg-background p-4">
                      <summary className="cursor-pointer text-sm font-bold text-text-primary">Follow-up email draft</summary>
                      <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{prospect.ai_email_draft}</pre>
                    </details>
                  ) : null}
                </div>

                <div className="grid gap-4">
                  <form action={updateProspectStatusAction} className="grid gap-3 rounded-2xl border border-border bg-background p-4">
                    <input name="prospectId" type="hidden" value={prospect.id} />
                    <label className="grid gap-2 text-sm font-medium text-text-secondary">
                      Status
                      <select
                        className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
                        defaultValue={prospect.status}
                        name="status"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button type="submit" variant="secondary">
                      Update status
                    </Button>
                  </form>

                  <form action={reanalyzeProspectAction} className="rounded-2xl border border-border bg-background p-4">
                    <input name="prospectId" type="hidden" value={prospect.id} />
                    <Button className="w-full" type="submit" variant="secondary">
                      <RotateCcw size={16} />
                      Re-analyze
                    </Button>
                  </form>

                  <form action={addProspectInteractionAction} className="grid gap-3 rounded-2xl border border-border bg-background p-4">
                    <input name="prospectId" type="hidden" value={prospect.id} />
                    <label className="grid gap-2 text-sm font-medium text-text-secondary">
                      Interaction type
                      <select className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary-light" name="interactionType">
                        <option value="note">Note</option>
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="meeting">Meeting</option>
                        <option value="demo">Demo</option>
                        <option value="proposal">Proposal</option>
                        <option value="task">Task</option>
                      </select>
                    </label>
                    <Textarea label="Note" name="content" placeholder="Add a follow-up note..." required />
                    <Button type="submit">Add note</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
