import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProgramCertificate = {
  id: string;
  certificate_number: string;
  issued_at: string;
  student_id: string;
  programs?: { name?: string | null; description?: string | null } | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

function formatCertificateDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

export default async function CertificateDetailPage({
  params
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { profile } = await requireProfile(["student", "admin"]);
  const { certificateId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: certificate } = await supabase
    .from("program_certificates")
    .select("*, programs(name,description), profiles:student_id(full_name,email)")
    .eq("id", certificateId)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (!certificate) {
    return (
      <Card>
        <CardContent className="grid gap-4 text-center">
          <h1 className="text-xl font-bold text-text-primary">Certificate not found</h1>
          <p className="text-sm text-text-secondary">The certificate is unavailable or does not belong to this account.</p>
          <Link className="font-semibold text-primary-hover" href="/dashboard/student/certificates">
            Back to certificates
          </Link>
        </CardContent>
      </Card>
    );
  }

  const programCertificate = certificate as ProgramCertificate;

  return (
    <div className="grid gap-6 print:block">
      <div className="flex flex-col justify-between gap-4 print:hidden sm:flex-row sm:items-center">
        <div>
          <Link className="text-sm font-semibold text-primary-hover" href="/dashboard/student/certificates">
            Back to certificates
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">Program certificate</h1>
          <p className="mt-2 text-text-secondary">Print this certificate or save it as a PDF from your browser.</p>
        </div>
        <PrintButton />
      </div>

      <section className="mx-auto max-w-5xl rounded-[2rem] border border-border bg-surface p-6 shadow-soft print:min-h-screen print:max-w-none print:rounded-none print:border-0 print:p-10 print:shadow-none sm:p-10">
        <div className="relative overflow-hidden rounded-[1.5rem] border-4 border-primary-light bg-[radial-gradient(circle_at_top_left,var(--color-primary-light),transparent_38%),radial-gradient(circle_at_bottom_right,var(--color-secondary-light),transparent_40%),var(--color-surface)] px-7 py-10 text-center print:border-primary sm:px-12 sm:py-14">
          <div className="absolute -left-16 -top-16 size-52 rounded-full bg-primary/10" />
          <div className="absolute -bottom-20 -right-12 size-64 rounded-full bg-secondary/10" />

          <div className="relative mx-auto flex max-w-3xl flex-col items-center">
            <BrandLogo imageClassName="h-14 w-14" />
            <p className="mt-10 text-sm font-black uppercase tracking-[0.35em] text-primary-hover">Certificate of Completion</p>
            <h2 className="mt-5 text-4xl font-black leading-tight text-text-primary sm:text-6xl">Dosis Educa</h2>
            <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-text-secondary">
              This certifies that
            </p>

            <div className="mt-6 w-full border-y border-border/80 py-7">
              <p className="text-4xl font-black leading-tight text-text-primary sm:text-5xl">
                {programCertificate.profiles?.full_name ?? profile.full_name}
              </p>
            </div>

            <p className="mt-7 max-w-3xl text-lg font-medium leading-8 text-text-secondary">
              has successfully completed all required courses for the program
            </p>
            <h3 className="mt-4 text-3xl font-black text-primary-hover sm:text-4xl">{programCertificate.programs?.name}</h3>

            <div className="mt-10 grid w-full gap-4 text-left sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface/85 p-4">
                <p className="text-xs font-bold uppercase text-text-secondary">Issued</p>
                <p className="mt-2 font-semibold text-text-primary">{formatCertificateDate(programCertificate.issued_at)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface/85 p-4">
                <p className="text-xs font-bold uppercase text-text-secondary">Certificate No.</p>
                <p className="mt-2 font-mono text-sm font-semibold text-text-primary">{programCertificate.certificate_number}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface/85 p-4">
                <p className="text-xs font-bold uppercase text-text-secondary">Status</p>
                <p className="mt-2 inline-flex items-center gap-2 font-semibold text-success">
                  <CheckCircle2 size={18} />
                  Conferred
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Badge tone="green">
                <ShieldCheck size={14} />
                Program completion verified
              </Badge>
              <Badge tone="blue">Finance clearance verified</Badge>
            </div>

            <div className="mt-12 grid w-full gap-8 sm:grid-cols-2">
              <div className="border-t border-text-primary pt-3">
                <p className="text-sm font-bold text-text-primary">Institution Administrator</p>
                <p className="mt-1 text-xs text-text-secondary">Dosis Educa LMS</p>
              </div>
              <div className="border-t border-text-primary pt-3">
                <p className="text-sm font-bold text-text-primary">Academic Records</p>
                <p className="mt-1 text-xs text-text-secondary">Verified digital certificate</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
