import { ArrowLeft, Building2, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { requestDemoAction } from "./actions";

const institutionTypes = [
  ["church", "Church"],
  ["bible_institute", "Bible institute"],
  ["seminary", "Seminary"],
  ["school", "School"],
  ["ministry", "Ministry"],
  ["nonprofit", "Nonprofit"],
  ["other", "Other"]
];

export default async function RequestDemoPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border bg-sidebar text-text-inverse">
        <div className="absolute -left-24 top-0 size-[30rem] rounded-full bg-primary/25 blur-[100px]" />
        <div className="absolute -right-20 top-0 size-[28rem] rounded-full bg-secondary/25 blur-[110px]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
          <div className="flex flex-col justify-between gap-10">
            <div>
              <Link className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-text-inverse/80 hover:text-accent" href="/">
                <ArrowLeft size={16} />
                Back to home
              </Link>
              <BrandLogo inverse />
              <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-accent/70 bg-sidebar-hover/70 px-4 py-2 text-sm font-bold text-accent shadow-soft">
                <Sparkles size={16} />
                Institution subscription pipeline
              </div>
              <h1 className="mt-6 max-w-xl text-5xl font-black leading-tight sm:text-6xl">Bring your institution into Dosis Educa.</h1>
              <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-text-inverse/75">
                Tell us about your programs, student volume, and goals. Our team will review your request and prepare the right LMS demo.
              </p>
            </div>
            <div className="grid gap-3 text-sm font-semibold text-text-inverse/82">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-accent" size={20} />
                Multi-tenant portal for each institution
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-accent" size={20} />
                Program-based access, certificates, and finance clearance
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-accent" size={20} />
                AI-assisted qualification for faster follow-up
              </div>
            </div>
          </div>

          <Card className="bg-surface/98">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary-light p-3 text-primary-hover">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Request a demo</h2>
                  <p className="text-sm text-text-secondary">Required fields help us qualify the institution correctly.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {params.sent ? (
                <div className="mb-5 rounded-xl border border-success bg-success-light px-4 py-3 text-sm font-semibold text-success">
                  Request received. A platform administrator can now review this institution in the prospect pipeline.
                </div>
              ) : null}
              {params.error ? (
                <div className="mb-5 rounded-xl border border-error bg-error-light px-4 py-3 text-sm font-semibold text-error">
                  {params.error}
                </div>
              ) : null}

              <form action={requestDemoAction} className="grid gap-4 md:grid-cols-2">
                <Input label="Institution name" name="institutionName" placeholder="Dosis Bible Institute" required />
                <label className="grid gap-2 text-sm font-medium text-text-secondary">
                  Institution type
                  <select
                    className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-light"
                    name="institutionType"
                    required
                  >
                    {institutionTypes.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <Input label="Website" name="website" placeholder="https://institution.org" />
                <Input label="Country" name="country" placeholder="Puerto Rico" />
                <Input label="City" name="city" placeholder="San Juan" />
                <Input label="Contact name" name="contactName" placeholder="Maria Rivera" required />
                <Input label="Contact role" name="contactRole" placeholder="Academic director" />
                <Input label="Email" name="email" placeholder="director@institution.org" required type="email" />
                <Input label="Phone" name="phone" placeholder="(787) 555-0100" />
                <Input label="Estimated students" min={0} name="estimatedStudents" placeholder="150" type="number" />
                <Input label="Estimated instructors" min={0} name="estimatedInstructors" placeholder="12" type="number" />
                <Input label="Budget range" name="budgetRange" placeholder="$500-$1,000/month" />
                <Textarea className="md:col-span-2" label="Programs needed" name="programsNeeded" placeholder="Certificate programs, ministry training, leadership tracks..." />
                <Textarea className="md:col-span-2" label="Current challenges" name="painPoints" placeholder="Manual enrollment, certificate tracking, Canvas alternative, finance clearance..." />
                <div className="md:col-span-2">
                  <Button className="h-12 rounded-full px-8" type="submit">
                    Submit request
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
