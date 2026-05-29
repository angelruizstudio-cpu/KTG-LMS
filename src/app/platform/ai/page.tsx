import { ArrowLeft, Bot, CheckCircle2, Database, KeyRound } from "lucide-react";
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

import { createAiKnowledgeSourceAction, updateAiKnowledgeStatusAction } from "./actions";

const categories = [
  ["general", "General"],
  ["features", "Features"],
  ["pricing", "Pricing"],
  ["qualification", "Qualification"],
  ["objections", "Objections"],
  ["email", "Email tone"],
  ["policy", "Policy"]
];

export default async function PlatformAiPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
}) {
  const params = await searchParams;
  await requirePlatformAdmin();
  const supabase = createSupabaseAdminClient();
  const [{ data: sources, error }, { count: activeCount }, { count: archivedCount }] = await Promise.all([
    supabase.from("ai_knowledge_sources").select("id,title,category,content,status,updated_at").order("updated_at", { ascending: false }),
    supabase.from("ai_knowledge_sources").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("ai_knowledge_sources").select("*", { count: "exact", head: true }).eq("status", "archived")
  ]);

  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  const model = process.env.OPENAI_MODEL || "gpt-5.2";

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
            <p className="text-sm font-bold uppercase tracking-wide text-primary-hover">AI training center</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Dosis Educa AI</h1>
            <p className="mt-2 max-w-3xl text-text-secondary">
              Train the institutional sales assistant with platform knowledge, qualification rules, pricing notes, objections, and follow-up tone.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-text-inverse shadow-glow hover:bg-primary-hover"
            href="/platform/prospects"
          >
            <Bot size={18} />
            Prospect pipeline
          </Link>
        </div>

        {params.error ? (
          <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm font-semibold text-error">{params.error}</div>
        ) : null}
        {params.created ? (
          <div className="rounded-xl border border-success bg-success-light px-3 py-2 text-sm font-semibold text-success">
            Knowledge source added.
          </div>
        ) : null}
        {params.updated ? (
          <div className="rounded-xl border border-secondary bg-secondary-light px-3 py-2 text-sm font-semibold text-secondary-hover">
            Knowledge source updated.
          </div>
        ) : null}
        {error ? <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">{error.message}</div> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-secondary">OpenAI connection</p>
                <p className="mt-2 text-xl font-bold text-text-primary">{hasApiKey ? "Connected" : "Not configured"}</p>
              </div>
              {hasApiKey ? <CheckCircle2 className="text-success" size={30} /> : <KeyRound className="text-warning" size={30} />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-secondary">Model</p>
                <p className="mt-2 text-xl font-bold text-text-primary">{model}</p>
              </div>
              <Bot className="text-primary" size={30} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-secondary">Active knowledge</p>
                <p className="mt-2 text-3xl font-bold text-text-primary">{activeCount ?? 0}</p>
                <p className="mt-1 text-xs text-text-secondary">{archivedCount ?? 0} archived</p>
              </div>
              <Database className="text-secondary" size={30} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Add knowledge</h2>
            <p className="text-sm text-text-secondary">
              Write the information you want the AI to remember when analyzing institutions.
            </p>
          </CardHeader>
          <CardContent>
            <form action={createAiKnowledgeSourceAction} className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <Input label="Title" name="title" placeholder="Pricing guidance for small institutes" required />
              <label className="grid gap-2 text-sm font-medium text-text-secondary">
                Category
                <select className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary-light" name="category">
                  {categories.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <Textarea
                className="lg:col-span-2"
                label="Knowledge content"
                name="content"
                placeholder="Example: For churches under 50 students, recommend a starter plan and focus the demo on simple program assignment, certificates, and instructor ease of use."
                required
              />
              <div className="lg:col-span-2">
                <Button type="submit">Add to AI knowledge</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {(sources ?? []).map((source) => (
            <Card key={source.id}>
              <CardContent className="grid gap-4 lg:grid-cols-[1fr_180px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-text-primary">{source.title}</h2>
                    <Badge tone={source.status === "active" ? "green" : "slate"}>{source.status}</Badge>
                    <Badge tone="blue">{source.category}</Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{source.content}</p>
                </div>
                <form action={updateAiKnowledgeStatusAction} className="flex items-start justify-end">
                  <input name="sourceId" type="hidden" value={source.id} />
                  <input name="status" type="hidden" value={source.status === "active" ? "archived" : "active"} />
                  <Button size="sm" type="submit" variant={source.status === "active" ? "secondary" : "primary"}>
                    {source.status === "active" ? "Archive" : "Activate"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
