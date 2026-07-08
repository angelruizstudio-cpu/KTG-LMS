import { Download, FileSpreadsheet, GraduationCap, TrendingUp, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { calculateGpa } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EnrollmentPreviewRow = {
  status: string;
  progress_percent: number;
  courses?: { title?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
};
type CertificatePreviewRow = {
  certificate_number: string;
  issued_at: string;
  programs?: { name?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
};

function DownloadLink({ href }: { href: string }) {
  return (
    <a
      className="inline-flex h-9 items-center gap-2 rounded-xl bg-secondary-light px-3 text-sm font-semibold text-secondary-hover transition hover:bg-primary-light hover:text-primary-hover"
      href={href}
    >
      <Download size={16} />
      Export CSV
    </a>
  );
}

export default async function RegistrarReportsPage() {
  const { profile } = await requireProfile(["registrar", "admin"]);
  const supabase = await createSupabaseServerClient();

  const [{ data: tenantCourses }, { data: tenantPrograms }] = await Promise.all([
    supabase.from("courses").select("id").eq("tenant_id", profile.default_tenant_id),
    supabase.from("programs").select("id").eq("tenant_id", profile.default_tenant_id)
  ]);
  const courseIds = (tenantCourses ?? []).map((course) => course.id);
  const programIds = (tenantPrograms ?? []).map((program) => program.id);

  const [{ data: recentEnrollments }, { data: studentIdentities }, { data: recentCertificates }, { count: activeProgramEnrollmentsCount }] =
    await Promise.all([
      courseIds.length
        ? supabase
            .from("enrollments")
            .select("status,progress_percent,courses(title),profiles:student_id(full_name)")
            .in("course_id", courseIds)
            .order("enrolled_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] as EnrollmentPreviewRow[] }),
      supabase
        .from("tenant_user_identities")
        .select("user_id")
        .eq("tenant_id", profile.default_tenant_id)
        .eq("role", "student"),
      programIds.length
        ? supabase
            .from("program_certificates")
            .select("certificate_number,issued_at,programs(name),profiles:student_id(full_name)")
            .in("program_id", programIds)
            .order("issued_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] as CertificatePreviewRow[] }),
      programIds.length
        ? supabase.from("program_enrollments").select("id", { count: "exact", head: true }).eq("status", "active").in("program_id", programIds)
        : Promise.resolve({ count: 0 })
    ]);

  const studentIds = (studentIdentities ?? []).map((identity) => identity.user_id);
  const { data: allGrades } = studentIds.length
    ? await supabase.from("gradebook_entries").select("score,max_score").in("student_id", studentIds)
    : { data: [] as { score: number; max_score: number }[] };
  const tenantAverageGpa = calculateGpa(allGrades ?? []);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Reports</h1>
        <p className="mt-2 text-text-secondary">Institution-wide enrollment, academic progress, graduation, and completion reports.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-secondary">Students</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{studentIds.length}</p>
            </div>
            <UsersRound className="text-secondary" size={28} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-secondary">Tenant average GPA</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{tenantAverageGpa === null ? "—" : tenantAverageGpa.toFixed(2)}</p>
            </div>
            <TrendingUp className="text-secondary" size={28} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-secondary">Active program enrollments</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{activeProgramEnrollmentsCount ?? 0}</p>
            </div>
            <GraduationCap className="text-secondary" size={28} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <FileSpreadsheet size={18} />
            Enrollment report
          </h2>
          <DownloadLink href="/api/registrar/reports/enrollment" />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {((recentEnrollments ?? []) as EnrollmentPreviewRow[]).map((row, index) => (
                <tr key={index}>
                  <td className="px-5 py-3 font-semibold text-text-primary">{row.profiles?.full_name}</td>
                  <td className="px-5 py-3 text-text-secondary">{row.courses?.title}</td>
                  <td className="px-5 py-3">
                    <Badge tone={row.status === "completed" ? "green" : row.status === "dropped" ? "amber" : "blue"}>{row.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-text-secondary">{row.progress_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(recentEnrollments ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-secondary">No enrollments yet.</p>
          ) : (
            <p className="px-5 py-3 text-xs text-text-secondary">Showing the 10 most recent. Export CSV for the full report.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <TrendingUp size={18} />
            Academic progress report
          </h2>
          <DownloadLink href="/api/registrar/reports/academic-progress" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            Per-student GPA, active courses, and completed courses across the institution. Export CSV for the full list of{" "}
            {studentIds.length} student{studentIds.length === 1 ? "" : "s"}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <GraduationCap size={18} />
            Graduation eligibility report
          </h2>
          <DownloadLink href="/api/registrar/reports/graduation-eligibility" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            For every active program enrollment: whether the student is eligible for their certificate today, and if not, why
            (missing required courses, finance not cleared, or already issued).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <FileSpreadsheet size={18} />
            Completions report
          </h2>
          <DownloadLink href="/api/registrar/reports/completions" />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Program</th>
                <th className="px-5 py-3">Certificate #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {((recentCertificates ?? []) as CertificatePreviewRow[]).map((row, index) => (
                <tr key={index}>
                  <td className="px-5 py-3 font-semibold text-text-primary">{row.profiles?.full_name}</td>
                  <td className="px-5 py-3 text-text-secondary">{row.programs?.name}</td>
                  <td className="px-5 py-3 font-mono text-text-secondary">{row.certificate_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(recentCertificates ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-secondary">No certificates issued yet.</p>
          ) : (
            <p className="px-5 py-3 text-xs text-text-secondary">Showing the 10 most recent. Export CSV for the full report.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
