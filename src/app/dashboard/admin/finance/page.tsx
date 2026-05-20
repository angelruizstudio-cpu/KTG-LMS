import { Award, CircleDollarSign, FileCheck2, ShieldAlert } from "lucide-react";

import { issueProgramCertificateAction, updateFinanceClearanceAction } from "@/app/dashboard/admin/programs/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FinanceClearance = {
  id: string;
  program_id: string;
  student_id: string;
  status: "hold" | "cleared";
  notes: string | null;
  updated_at: string;
  programs?: { name?: string | null } | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

type ProgramCertificate = {
  id: string;
  program_id: string;
  student_id: string;
  certificate_number: string;
};

type CourseEnrollment = {
  course_id: string;
  student_id: string;
  status: "active" | "completed" | "dropped";
};

type ProgramCourse = {
  program_id: string;
  course_id: string;
  required: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function AdminFinancePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireProfile(["admin"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: clearances }, { data: certificates }, { data: programCourses }, { data: enrollments }] = await Promise.all([
    supabase
      .from("finance_clearances")
      .select("*, programs(name), profiles:student_id(full_name,email)")
      .order("updated_at", { ascending: false }),
    supabase.from("program_certificates").select("id,program_id,student_id,certificate_number"),
    supabase.from("program_courses").select("program_id,course_id,required").eq("required", true),
    supabase.from("enrollments").select("course_id,student_id,status")
  ]);

  const financeRows = (clearances ?? []) as FinanceClearance[];
  const certificatesByProgramStudent = new Map(
    ((certificates ?? []) as ProgramCertificate[]).map((certificate) => [`${certificate.program_id}:${certificate.student_id}`, certificate])
  );
  const requiredCoursesByProgram = ((programCourses ?? []) as ProgramCourse[]).reduce<Record<string, string[]>>((acc, item) => {
    acc[item.program_id] = [...(acc[item.program_id] ?? []), item.course_id];
    return acc;
  }, {});
  const completedCoursesByStudent = ((enrollments ?? []) as CourseEnrollment[])
    .filter((enrollment) => enrollment.status === "completed")
    .reduce<Record<string, Set<string>>>((acc, enrollment) => {
      acc[enrollment.student_id] = acc[enrollment.student_id] ?? new Set<string>();
      acc[enrollment.student_id].add(enrollment.course_id);
      return acc;
    }, {});

  const holdCount = financeRows.filter((row) => row.status === "hold").length;
  const clearedCount = financeRows.filter((row) => row.status === "cleared").length;
  const certificateReadyCount = financeRows.filter((row) => {
    if (row.status !== "cleared" || certificatesByProgramStudent.has(`${row.program_id}:${row.student_id}`)) {
      return false;
    }

    const requiredCourseIds = requiredCoursesByProgram[row.program_id] ?? [];
    const completedCourseIds = completedCoursesByStudent[row.student_id] ?? new Set<string>();
    return requiredCourseIds.length > 0 && requiredCourseIds.every((courseId) => completedCourseIds.has(courseId));
  }).length;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Finance center</h1>
        <p className="mt-2 text-text-secondary">
          Review financial holds, clear student accounts, and release certificates after academic completion.
        </p>
      </div>

      {params.error ? (
        <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">{params.error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Finance records", value: financeRows.length, Icon: CircleDollarSign, tone: "text-secondary" },
          { label: "On hold", value: holdCount, Icon: ShieldAlert, tone: "text-warning" },
          { label: "Cleared", value: clearedCount, Icon: FileCheck2, tone: "text-success" },
          { label: "Ready to certify", value: certificateReadyCount, Icon: Award, tone: "text-primary-hover" }
        ].map(({ Icon, label, tone, value }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-secondary">{label}</p>
                <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
              </div>
              <Icon className={tone} size={30} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Student finance clearance</h2>
        </CardHeader>
        <CardContent className="grid gap-4">
          {financeRows.length ? (
            financeRows.map((row) => {
              const certificate = certificatesByProgramStudent.get(`${row.program_id}:${row.student_id}`);
              const requiredCourseIds = requiredCoursesByProgram[row.program_id] ?? [];
              const completedCourseIds = completedCoursesByStudent[row.student_id] ?? new Set<string>();
              const completedRequired = requiredCourseIds.filter((courseId) => completedCourseIds.has(courseId)).length;
              const academicallyComplete =
                requiredCourseIds.length > 0 && requiredCourseIds.every((courseId) => completedCourseIds.has(courseId));

              return (
                <div key={row.id} className="grid gap-4 rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-text-primary">{row.profiles?.full_name ?? "Student"}</h3>
                        <Badge tone={row.status === "cleared" ? "green" : "amber"}>{row.status}</Badge>
                        <Badge tone={academicallyComplete ? "green" : "blue"}>
                          {completedRequired}/{requiredCourseIds.length} required complete
                        </Badge>
                        <Badge tone={certificate ? "green" : "slate"}>{certificate ? "certificate issued" : "no certificate"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">{row.profiles?.email}</p>
                      <p className="mt-1 text-sm font-semibold text-text-primary">{row.programs?.name ?? "Program"}</p>
                      <p className="mt-1 text-xs text-text-secondary">Last updated: {formatDate(row.updated_at)}</p>
                      {row.notes ? <p className="mt-3 text-sm text-text-secondary">{row.notes}</p> : null}
                    </div>
                    {certificate ? <p className="font-mono text-xs text-text-secondary">{certificate.certificate_number}</p> : null}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                    <form action={updateFinanceClearanceAction} className="grid gap-3 md:grid-cols-[140px_1fr_auto] md:items-end">
                      <input name="programId" type="hidden" value={row.program_id} />
                      <input name="studentId" type="hidden" value={row.student_id} />
                      <input name="returnTo" type="hidden" value="finance" />
                      <label className="grid gap-2 text-sm font-medium text-text-secondary">
                        Status
                        <select
                          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary"
                          defaultValue={row.status}
                          name="status"
                          required
                        >
                          <option value="hold">Hold</option>
                          <option value="cleared">Cleared</option>
                        </select>
                      </label>
                      <Input defaultValue={row.notes ?? ""} label="Finance notes" name="notes" />
                      <Button type="submit">Save</Button>
                    </form>

                    <form action={issueProgramCertificateAction}>
                      <input name="programId" type="hidden" value={row.program_id} />
                      <input name="studentId" type="hidden" value={row.student_id} />
                      <input name="returnTo" type="hidden" value="finance" />
                      <Button disabled={Boolean(certificate) || row.status !== "cleared" || !academicallyComplete} type="submit" variant="secondary">
                        Issue certificate
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
              <p className="font-semibold text-text-primary">No finance records yet</p>
              <p className="mt-2 text-sm text-text-secondary">Assign students to programs to create finance clearance records.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
