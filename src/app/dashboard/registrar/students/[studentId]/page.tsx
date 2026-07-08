import { Archive, ArrowLeft, ArrowRightLeft, Award, BookOpenCheck, RotateCcw, Trophy, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { assignStudentToProgramAction, grantCourseAccessAction } from "@/app/dashboard/admin/programs/actions";
import {
  archiveStudentAction,
  transferEnrollmentAction,
  unarchiveStudentAction,
  updateAcademicStatusAction,
  updateStudentContactAction,
  withdrawFromCourseAction
} from "@/app/dashboard/registrar/students/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmSubmitButton, SubmitButton } from "@/components/ui/submit-button";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime, sanitizeBannerMessage } from "@/lib/utils";
import type { AcademicStatus } from "@/types/database";

const statusTone: Record<AcademicStatus, "blue" | "green" | "amber" | "slate"> = {
  active: "green",
  inactive: "slate",
  withdrawn: "amber",
  suspended: "amber",
  graduated: "blue"
};

type EnrollmentWithCourse = {
  id: string;
  course_id: string;
  status: string;
  progress_percent: number;
  enrolled_at: string;
  completed_at: string | null;
  courses?: { title?: string | null } | null;
};
type GradebookEntryWithCourse = {
  id: string;
  item_name: string;
  score: number;
  max_score: number;
  feedback: string | null;
  created_at: string;
  courses?: { title?: string | null } | null;
};
type CertificateWithProgram = {
  id: string;
  certificate_number: string;
  issued_at: string;
  programs?: { name?: string | null } | null;
};

export default async function RegistrarStudentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireProfile(["registrar", "admin"]);
  const { studentId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: student } = await supabase.from("profiles").select("*").eq("id", studentId).eq("role", "student").maybeSingle();

  if (!student || student.default_tenant_id !== profile.default_tenant_id) {
    notFound();
  }

  const [{ data: identity }, { data: enrollments }, { data: gradebookEntries }, { data: certificates }, { data: programs }, { data: courses }] =
    await Promise.all([
      supabase
        .from("tenant_user_identities")
        .select("institution_user_id")
        .eq("tenant_id", profile.default_tenant_id)
        .eq("user_id", studentId)
        .maybeSingle(),
      supabase
        .from("enrollments")
        .select("id,course_id,status,progress_percent,enrolled_at,completed_at,courses(title)")
        .eq("student_id", studentId)
        .order("enrolled_at", { ascending: false }),
      supabase
        .from("gradebook_entries")
        .select("id,item_name,score,max_score,feedback,created_at,courses(title)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("program_certificates")
        .select("id,certificate_number,issued_at,programs(name)")
        .eq("student_id", studentId)
        .order("issued_at", { ascending: false }),
      supabase.from("programs").select("id,name").eq("tenant_id", profile.default_tenant_id).order("name"),
      supabase.from("courses").select("id,title").eq("tenant_id", profile.default_tenant_id).order("title")
    ]);

  const isArchived = Boolean(student.archived_at);
  const returnTo = `/dashboard/registrar/students/${studentId}`;

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/dashboard/registrar/students" className="inline-flex items-center gap-1 text-sm font-semibold text-text-secondary hover:text-primary-hover">
          <ArrowLeft size={16} /> All students
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-text-primary">{student.full_name}</h1>
          <Badge tone={statusTone[student.academic_status as AcademicStatus]}>{student.academic_status}</Badge>
          {isArchived ? <Badge tone="slate">archived</Badge> : null}
        </div>
        <p className="mt-2 text-text-secondary">
          {student.email} · <span className="font-mono">{identity?.institution_user_id ?? "Institution ID not issued"}</span>
        </p>
      </div>

      {query.error ? <Alert variant="error">{sanitizeBannerMessage(query.error)}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Contact information</h2>
          </CardHeader>
          <CardContent>
            <form action={updateStudentContactAction} className="grid gap-4">
              <input name="studentId" type="hidden" value={student.id} />
              <Input label="Full name" name="fullName" defaultValue={student.full_name} required />
              <Input label="Email" name="email" type="email" defaultValue={student.email} required />
              <SubmitButton className="w-fit" pendingLabel="Saving…">
                Save contact info
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Academic status</h2>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form action={updateAcademicStatusAction} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <input name="studentId" type="hidden" value={student.id} />
              <Select label="Status" name="academicStatus" defaultValue={student.academic_status}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="graduated">Graduated</option>
                <option value="suspended">Suspended</option>
              </Select>
              <SubmitButton pendingLabel="Saving…">Save status</SubmitButton>
            </form>

            <div className="border-t border-border pt-4">
              {isArchived ? (
                <form action={unarchiveStudentAction}>
                  <input name="studentId" type="hidden" value={student.id} />
                  <SubmitButton variant="secondary" pendingLabel="Restoring…">
                    <RotateCcw size={16} />
                    Restore record
                  </SubmitButton>
                </form>
              ) : (
                <form action={archiveStudentAction}>
                  <input name="studentId" type="hidden" value={student.id} />
                  <ConfirmSubmitButton
                    variant="secondary"
                    confirmMessage={`Archive ${student.full_name}'s record? They will be hidden from the default student list, but nothing is deleted and this can be undone.`}
                  >
                    <Archive size={16} />
                    Archive record
                  </ConfirmSubmitButton>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <UserPlus size={18} />
            Enroll in program or course
          </h2>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <form action={assignStudentToProgramAction} className="grid gap-3">
            <input name="studentId" type="hidden" value={student.id} />
            <input name="redirectTo" type="hidden" value={returnTo} />
            <Select label="Assign to program" name="programId" required defaultValue="">
              <option value="" disabled>
                {(programs ?? []).length ? "Select a program…" : "No programs yet"}
              </option>
              {(programs ?? []).map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </Select>
            <SubmitButton className="w-fit" size="sm" pendingLabel="Assigning…">
              Assign to program
            </SubmitButton>
          </form>

          <form action={grantCourseAccessAction} className="grid gap-3">
            <input name="studentId" type="hidden" value={student.id} />
            <input name="redirectTo" type="hidden" value={returnTo} />
            <Select label="Grant a single course" name="courseId" required defaultValue="">
              <option value="" disabled>
                {(courses ?? []).length ? "Select a course…" : "No courses yet"}
              </option>
              {(courses ?? []).map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
            <SubmitButton className="w-fit" size="sm" pendingLabel="Granting…">
              Grant access
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <BookOpenCheck size={18} />
            Course enrollment history
          </h2>
        </CardHeader>
        <CardContent className="grid gap-2">
          {((enrollments ?? []) as EnrollmentWithCourse[]).length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">No course enrollments yet.</p>
          ) : (
            ((enrollments ?? []) as EnrollmentWithCourse[]).map((enrollment) => (
              <div key={enrollment.id} className="grid gap-3 rounded-xl border border-border bg-background p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">{enrollment.courses?.title ?? "Course"}</p>
                    <p className="mt-1 text-xs text-text-secondary">Enrolled {formatDateTime(enrollment.enrolled_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-secondary">{enrollment.progress_percent}%</span>
                    <Badge tone={enrollment.status === "completed" ? "green" : enrollment.status === "dropped" ? "amber" : "blue"}>
                      {enrollment.status}
                    </Badge>
                  </div>
                </div>
                {enrollment.status === "active" ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <form action={withdrawFromCourseAction}>
                      <input name="studentId" type="hidden" value={student.id} />
                      <input name="enrollmentId" type="hidden" value={enrollment.id} />
                      <ConfirmSubmitButton
                        size="sm"
                        variant="secondary"
                        confirmMessage={`Withdraw ${student.full_name} from ${enrollment.courses?.title ?? "this course"}?`}
                      >
                        Withdraw
                      </ConfirmSubmitButton>
                    </form>
                    <form action={transferEnrollmentAction} className="flex flex-wrap items-center gap-2">
                      <input name="studentId" type="hidden" value={student.id} />
                      <input name="fromEnrollmentId" type="hidden" value={enrollment.id} />
                      <Select srLabel={`Transfer ${student.full_name} to another course`} name="toCourseId" required defaultValue="" className="h-9 py-0">
                        <option value="" disabled>
                          Transfer to…
                        </option>
                        {(courses ?? [])
                          .filter((course) => course.id !== enrollment.course_id)
                          .map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                      </Select>
                      <SubmitButton size="sm" variant="secondary" pendingLabel="Transferring…">
                        <ArrowRightLeft size={14} />
                        Transfer
                      </SubmitButton>
                    </form>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <Trophy size={18} />
            Recent grades
          </h2>
        </CardHeader>
        <CardContent className="grid gap-2">
          {((gradebookEntries ?? []) as GradebookEntryWithCourse[]).length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">No grades recorded yet.</p>
          ) : (
            ((gradebookEntries ?? []) as GradebookEntryWithCourse[]).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-background p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-text-primary">{entry.item_name}</p>
                  <span className="font-mono text-text-secondary">
                    {entry.score}/{entry.max_score}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">{entry.courses?.title}</p>
                {entry.feedback ? <p className="mt-2 text-text-secondary">{entry.feedback}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <Award size={18} />
            Certificates
          </h2>
        </CardHeader>
        <CardContent className="grid gap-2">
          {((certificates ?? []) as CertificateWithProgram[]).length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">No certificates issued yet.</p>
          ) : (
            ((certificates ?? []) as CertificateWithProgram[]).map((certificate) => (
              <div key={certificate.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-sm">
                <div>
                  <p className="font-semibold text-text-primary">{certificate.programs?.name ?? "Program"}</p>
                  <p className="mt-1 font-mono text-xs text-text-secondary">{certificate.certificate_number}</p>
                </div>
                <span className="text-xs text-text-secondary">{formatDateTime(certificate.issued_at)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
