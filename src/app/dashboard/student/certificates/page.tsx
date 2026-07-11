import { Award } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { requireProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProgramCertificate = {
  id: string;
  certificate_number: string;
  issued_at: string;
  programs?: { name?: string | null } | null;
};
type ProgramEnrollment = {
  program_id: string;
  programs?: { name?: string | null } | null;
};
type FinanceClearance = {
  program_id: string;
  status: string;
  notes: string | null;
};

export default async function CertificatesPage() {
  const { profile } = await requireProfile(["student", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { t } = await getDictionary();
  const tc = t.dashboard.student.certificatesPage;
  const [{ data: certificates }, { data: programEnrollments }, { data: financeClearances }] = await Promise.all([
    supabase
      .from("program_certificates")
      .select("*, programs(name)")
      .eq("student_id", profile.id)
      .order("issued_at", { ascending: false }),
    supabase.from("program_enrollments").select("program_id, programs(name)").eq("student_id", profile.id).eq("status", "active"),
    supabase.from("finance_clearances").select("program_id,status,notes").eq("student_id", profile.id)
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">{tc.title}</h1>
        <p className="mt-2 text-text-secondary">{tc.subtitle}</p>
      </div>

      {(certificates ?? []).length === 0 ? (
        <EmptyState description={tc.emptyDescription} title={tc.emptyTitle} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {((certificates ?? []) as ProgramCertificate[]).map((certificate) => (
            <Card key={certificate.id} className="soft-gradient">
              <CardContent className="relative overflow-hidden">
                <div className="absolute right-5 top-5 text-primary-light">
                  <Award size={80} />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-hover">{tc.certificateOfCompletion}</p>
                <h2 className="mt-5 text-2xl font-bold text-text-primary">{certificate.programs?.name}</h2>
                <p className="mt-4 text-sm text-text-secondary">{tc.awardedTo}</p>
                <p className="text-xl font-bold text-text-primary">{profile.full_name}</p>
                <p className="mt-8 text-xs font-semibold text-text-secondary">{certificate.certificate_number}</p>
                <LinkButton className="mt-5 print:hidden" href={`/dashboard/student/certificates/${certificate.id}`} size="sm">
                  {tc.viewPrint}
                </LinkButton>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent>
          <h2 className="font-semibold text-text-primary">{tc.programCertificateStatus}</h2>
          <div className="mt-4 grid gap-3">
            {(programEnrollments ?? []).length ? (
              ((programEnrollments ?? []) as ProgramEnrollment[]).map((enrollment) => {
                const clearance = ((financeClearances ?? []) as FinanceClearance[]).find(
                  (item) => item.program_id === enrollment.program_id
                );
                return (
                  <div key={enrollment.program_id} className="rounded-xl border border-border bg-background p-3 text-sm">
                    <p className="font-semibold text-text-primary">{enrollment.programs?.name ?? tc.program}</p>
                    <p className="mt-1 text-text-secondary">
                      {tc.financeStatus}: <span className="font-semibold">{clearance?.status ?? "hold"}</span>
                    </p>
                    {clearance?.notes ? (
                      <p className="mt-1 text-text-secondary">
                        {tc.notes}: {clearance.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-text-secondary">{tc.noActiveEnrollment}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
