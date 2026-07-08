import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateGpa, formatDateTime } from "@/lib/utils";

type EnrollmentWithCourse = {
  id: string;
  status: string;
  progress_percent: number;
  courses?: { title?: string | null } | null;
};
type GradebookEntryWithCourse = {
  id: string;
  item_name: string;
  score: number;
  max_score: number;
  courses?: { title?: string | null } | null;
};
type CertificateWithProgram = {
  id: string;
  certificate_number: string;
  issued_at: string;
  programs?: { name?: string | null } | null;
};

export default async function RegistrarStudentTranscriptPage({
  params,
  searchParams
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ official?: string }>;
}) {
  const { profile } = await requireProfile(["registrar", "admin"]);
  const { studentId } = await params;
  const { official } = await searchParams;
  const isOfficial = official === "1";
  const supabase = await createSupabaseServerClient();

  const { data: student } = await supabase.from("profiles").select("*").eq("id", studentId).eq("role", "student").maybeSingle();

  if (!student || student.default_tenant_id !== profile.default_tenant_id) {
    notFound();
  }

  const [{ data: identity }, { data: enrollments }, { data: gradebookEntries }, { data: certificates }] = await Promise.all([
    supabase
      .from("tenant_user_identities")
      .select("institution_user_id")
      .eq("tenant_id", profile.default_tenant_id)
      .eq("user_id", studentId)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select("id,status,progress_percent,courses(title)")
      .eq("student_id", studentId)
      .order("enrolled_at", { ascending: false }),
    supabase.from("gradebook_entries").select("id,item_name,score,max_score,courses(title)").eq("student_id", studentId),
    supabase
      .from("program_certificates")
      .select("id,certificate_number,issued_at,programs(name)")
      .eq("student_id", studentId)
      .order("issued_at", { ascending: false })
  ]);

  const gpaValue = calculateGpa((gradebookEntries ?? []) as GradebookEntryWithCourse[]);
  const gpa = gpaValue === null ? "—" : gpaValue.toFixed(2);
  const completedCourses = ((enrollments ?? []) as EnrollmentWithCourse[]).filter((enrollment) => enrollment.status === "completed");

  return (
    <div className="grid gap-6 print:block">
      <div className="flex flex-col justify-between gap-4 print:hidden sm:flex-row sm:items-center">
        <div>
          <Link className="text-sm font-semibold text-primary-hover" href={`/dashboard/registrar/students/${studentId}`}>
            Back to student record
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">
            {isOfficial ? "Official transcript" : "Unofficial transcript"}
          </h1>
          <p className="mt-2 text-text-secondary">
            {isOfficial
              ? "Includes a certification seal and the issuing registrar's name."
              : "For advising and internal use. Switch to the official version to add a certification seal."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="text-sm font-semibold text-primary-hover"
            href={
              isOfficial
                ? `/dashboard/registrar/students/${studentId}/transcript`
                : `/dashboard/registrar/students/${studentId}/transcript?official=1`
            }
          >
            {isOfficial ? "View unofficial version" : "Generate official version"}
          </Link>
          <PrintButton />
        </div>
      </div>

      <section className="mx-auto max-w-4xl rounded-3xl border border-border bg-surface p-8 shadow-soft print:max-w-none print:rounded-none print:border-0 print:p-10 print:shadow-none">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <BrandLogo imageClassName="h-10 w-10" />
            <div>
              <p className="font-bold text-text-primary">Dosis Educa</p>
              <p className="text-xs text-text-secondary">Academic transcript</p>
            </div>
          </div>
          {isOfficial ? (
            <Badge tone="green">
              <ShieldCheck size={14} />
              Official
            </Badge>
          ) : (
            <Badge tone="slate">Unofficial — not certified</Badge>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase text-text-secondary">Student</p>
            <p className="mt-1 font-semibold text-text-primary">{student.full_name}</p>
            <p className="text-sm text-text-secondary">{student.email}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-text-secondary">Institution ID</p>
            <p className="mt-1 font-mono text-sm text-text-primary">{identity?.institution_user_id ?? "Not issued"}</p>
            <p className="mt-2 text-xs font-bold uppercase text-text-secondary">Academic status</p>
            <p className="text-sm capitalize text-text-primary">{student.academic_status}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-bold uppercase text-text-secondary">GPA</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{gpa}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-bold uppercase text-text-secondary">Courses completed</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{completedCourses.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-bold uppercase text-text-secondary">Certificates issued</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{(certificates ?? []).length}</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-semibold text-text-primary">Course history</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-2">Course</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {((enrollments ?? []) as EnrollmentWithCourse[]).map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="px-4 py-2 font-semibold text-text-primary">{enrollment.courses?.title ?? "Course"}</td>
                    <td className="px-4 py-2 capitalize text-text-secondary">{enrollment.status}</td>
                    <td className="px-4 py-2 text-text-secondary">{enrollment.progress_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-semibold text-text-primary">Program certificates</h2>
          <div className="mt-3 grid gap-2">
            {(certificates ?? []).length === 0 ? (
              <p className="text-sm text-text-secondary">No certificates issued yet.</p>
            ) : (
              ((certificates ?? []) as CertificateWithProgram[]).map((certificate) => (
                <div key={certificate.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <div>
                    <p className="font-semibold text-text-primary">{certificate.programs?.name ?? "Program"}</p>
                    <p className="font-mono text-xs text-text-secondary">{certificate.certificate_number}</p>
                  </div>
                  <span className="text-xs text-text-secondary">{formatDateTime(certificate.issued_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {isOfficial ? (
          <div className="mt-10 grid gap-8 border-t border-text-primary pt-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-bold text-text-primary">Certified by</p>
              <p className="mt-1 text-sm text-text-secondary">{profile.full_name}, Registrar</p>
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Date issued</p>
              <p className="mt-1 text-sm text-text-secondary">{formatDateTime(new Date().toISOString())}</p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
