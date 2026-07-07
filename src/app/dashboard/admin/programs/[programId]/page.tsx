import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addCourseToProgramAction,
  addPrerequisiteAction,
  assignStudentToProgramAction,
  grantCourseAccessAction,
  grantEligibleProgramAccessAction,
  issueProgramCertificateAction,
  updateFinanceClearanceAction
} from "@/app/dashboard/admin/programs/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmSubmitButton, SubmitButton } from "@/components/ui/submit-button";
import { cn, sanitizeBannerMessage } from "@/lib/utils";
import { requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type Student = { id: string; full_name: string; email: string; institution_user_id?: string };
type ProgramCourseWithCourse = {
  id: string;
  course_id: string;
  position: number;
  required: boolean;
  courses?: { title?: string | null; status?: string | null } | null;
};
type ProgramEnrollmentWithProfile = {
  id: string;
  student_id: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};
type PrerequisiteWithNames = {
  id: string;
  prerequisite?: { title?: string | null } | null;
  course?: { title?: string | null } | null;
};
type FinanceClearance = { student_id: string; status: "hold" | "cleared"; notes: string | null };
type ProgramCertificate = { student_id: string; certificate_number: string };
type CourseEnrollment = { course_id: string; student_id: string; status: "active" | "completed" | "dropped" };

const TABS = [
  { key: "students", label: "Students" },
  { key: "courses", label: "Courses" },
  { key: "finance", label: "Finance" },
  { key: "prerequisites", label: "Prerequisites" }
] as const;

type TabKey = (typeof TABS)[number]["key"];

function studentLabel(student: Student) {
  return `${student.institution_user_id ?? "ID"} - ${student.full_name} (${student.email})`;
}

export default async function AdminProgramDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ tab?: string; error?: string; created?: string; access?: string; saved?: string; issued?: string }>;
}) {
  const { profile } = await requireProfile(["admin"]);
  const { programId } = await params;
  const query = await searchParams;
  const supabase = createSupabaseAdminClient();

  const { data: program } = await supabase
    .from("programs")
    .select("id,name,description,active,tenant_id")
    .eq("id", programId)
    .maybeSingle();

  // Scope to the caller's tenant so an admin cannot open another institution's program by id.
  if (!program || program.tenant_id !== profile.default_tenant_id) {
    notFound();
  }

  const activeTab: TabKey = TABS.some((tab) => tab.key === query.tab) ? (query.tab as TabKey) : "students";
  const basePath = `/dashboard/admin/programs/${programId}`;
  const returnTo = `${basePath}?tab=${activeTab}`;

  const [
    { data: coursesData },
    { data: studentIdentities },
    { data: programCoursesData },
    { data: programEnrollmentsData },
    { data: financeClearancesData },
    { data: programCertificatesData }
  ] = await Promise.all([
    supabase.from("courses").select("id,title,status").eq("tenant_id", profile.default_tenant_id).order("title"),
    supabase
      .from("tenant_user_identities")
      .select("user_id,institution_user_id,profiles:user_id(full_name,email)")
      .eq("tenant_id", profile.default_tenant_id)
      .eq("role", "student")
      .eq("status", "active")
      .order("institution_user_id"),
    supabase.from("program_courses").select("id,course_id,position,required, courses(title,status)").eq("program_id", programId).order("position"),
    supabase.from("program_enrollments").select("id,student_id, profiles:student_id(full_name,email)").eq("program_id", programId).order("enrolled_at", { ascending: false }),
    supabase.from("finance_clearances").select("student_id,status,notes").eq("program_id", programId),
    supabase.from("program_certificates").select("student_id,certificate_number").eq("program_id", programId)
  ]);

  const courses = (coursesData ?? []) as { id: string; title: string; status: string }[];
  const programCourses = (programCoursesData ?? []) as ProgramCourseWithCourse[];
  const programEnrollments = (programEnrollmentsData ?? []) as ProgramEnrollmentWithProfile[];
  const financeClearances = (financeClearancesData ?? []) as FinanceClearance[];
  const programCertificates = (programCertificatesData ?? []) as ProgramCertificate[];
  const programCourseIds = programCourses.map((item) => item.course_id);

  const { data: prerequisitesData } = programCourseIds.length
    ? await supabase
        .from("course_prerequisites")
        .select("id, prerequisite:prerequisite_course_id(title), course:course_id(title)")
        .in("course_id", programCourseIds)
    : { data: [] as PrerequisiteWithNames[] };
  const { data: courseEnrollmentsData } = programCourseIds.length
    ? await supabase.from("enrollments").select("course_id,student_id,status").in("course_id", programCourseIds)
    : { data: [] as CourseEnrollment[] };

  const prerequisites = (prerequisitesData ?? []) as PrerequisiteWithNames[];
  const courseEnrollments = (courseEnrollmentsData ?? []) as CourseEnrollment[];

  const students: Student[] = (studentIdentities ?? []).map((identity) => {
    const studentProfile = Array.isArray(identity.profiles) ? identity.profiles[0] : identity.profiles;
    return {
      id: identity.user_id,
      full_name: studentProfile?.full_name ?? "Unknown student",
      email: studentProfile?.email ?? "No email",
      institution_user_id: identity.institution_user_id ?? undefined
    };
  });

  const clearanceByStudent = new Map(financeClearances.map((clearance) => [clearance.student_id, clearance]));
  const certificateByStudent = new Map(programCertificates.map((certificate) => [certificate.student_id, certificate]));
  const enrollmentsByStudent = courseEnrollments.reduce<Record<string, CourseEnrollment[]>>((acc, enrollment) => {
    acc[enrollment.student_id] = [...(acc[enrollment.student_id] ?? []), enrollment];
    return acc;
  }, {});

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/dashboard/admin/programs" className="inline-flex items-center gap-1 text-sm font-semibold text-text-secondary hover:text-primary-hover">
          <ArrowLeft size={16} /> All programs
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-text-primary">{program.name}</h1>
          <Badge tone={program.active ? "green" : "slate"}>{program.active ? "active" : "inactive"}</Badge>
        </div>
        <p className="mt-2 text-text-secondary">{program.description || "No description yet."}</p>
      </div>

      {query.error ? <Alert variant="error">{sanitizeBannerMessage(query.error)}</Alert> : null}
      {query.created ? <Alert variant="success">Program created: {sanitizeBannerMessage(query.created, 80)}</Alert> : null}
      {query.access ? (
        <Alert variant="success">
          Opened {sanitizeBannerMessage(query.access, 6)} eligible course(s) for the student.
        </Alert>
      ) : null}
      {query.saved ? <Alert variant="success">Finance clearance saved.</Alert> : null}
      {query.issued ? <Alert variant="success">Certificate issued.</Alert> : null}

      <nav aria-label="Program sections" className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`${basePath}?tab=${tab.key}`}
            aria-current={tab.key === activeTab ? "page" : undefined}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              tab.key === activeTab ? "bg-primary text-text-inverse shadow-glow" : "text-text-secondary hover:bg-secondary-light hover:text-text-primary"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "students" ? (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Assign student to program</h2>
            </CardHeader>
            <CardContent>
              <form action={assignStudentToProgramAction} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <input name="redirectTo" type="hidden" value={returnTo} />
                <input name="programId" type="hidden" value={programId} />
                <Select label="Student" name="studentId" required defaultValue="">
                  <option value="" disabled>
                    {students.length ? "Select a student…" : "No active students yet"}
                  </option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {studentLabel(student)}
                    </option>
                  ))}
                </Select>
                <SubmitButton pendingLabel="Assigning…">Assign</SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Enrolled students ({programEnrollments.length})</h2>
            </CardHeader>
            <CardContent className="grid gap-3">
              {programEnrollments.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-secondary">No students assigned to this program yet.</p>
              ) : (
                programEnrollments.map((enrollment) => {
                  const clearance = clearanceByStudent.get(enrollment.student_id);
                  const certificate = certificateByStudent.get(enrollment.student_id);
                  const studentEnrollments = (enrollmentsByStudent[enrollment.student_id] ?? []).filter((item) =>
                    programCourseIds.includes(item.course_id)
                  );
                  const active = studentEnrollments.filter((item) => item.status === "active").length;
                  const completed = studentEnrollments.filter((item) => item.status === "completed").length;

                  return (
                    <div key={enrollment.id} className="grid gap-3 rounded-xl border border-border bg-background p-4 text-sm">
                      <div>
                        <p className="font-semibold text-text-primary">{enrollment.profiles?.full_name}</p>
                        <p className="mt-1 text-xs text-text-secondary">{enrollment.profiles?.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={clearance?.status === "cleared" ? "green" : "amber"}>finance {clearance?.status ?? "hold"}</Badge>
                        <Badge tone={certificate ? "green" : "slate"}>{certificate ? "certificate issued" : "no certificate"}</Badge>
                        <Badge tone="blue">
                          {active} active / {completed} completed
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={grantEligibleProgramAccessAction}>
                          <input name="redirectTo" type="hidden" value={returnTo} />
                          <input name="programId" type="hidden" value={programId} />
                          <input name="studentId" type="hidden" value={enrollment.student_id} />
                          <SubmitButton size="sm" pendingLabel="Opening…">
                            Open eligible courses
                          </SubmitButton>
                        </form>
                        <form action={issueProgramCertificateAction}>
                          <input name="redirectTo" type="hidden" value={returnTo} />
                          <input name="programId" type="hidden" value={programId} />
                          <input name="studentId" type="hidden" value={enrollment.student_id} />
                          <ConfirmSubmitButton
                            size="sm"
                            variant="secondary"
                            disabled={Boolean(certificate)}
                            confirmMessage={`Issue the program certificate for ${enrollment.profiles?.full_name ?? "this student"}?`}
                          >
                            Issue certificate
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Grant a single course</h2>
            </CardHeader>
            <CardContent>
              <form action={grantCourseAccessAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <input name="redirectTo" type="hidden" value={returnTo} />
                <Select label="Student" name="studentId" required defaultValue="">
                  <option value="" disabled>
                    Select a student…
                  </option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {studentLabel(student)}
                    </option>
                  ))}
                </Select>
                <Select label="Course" name="courseId" required defaultValue="">
                  <option value="" disabled>
                    {programCourses.length ? "Select a course…" : "Add a course first"}
                  </option>
                  {programCourses.map((item) => (
                    <option key={item.id} value={item.course_id}>
                      {item.courses?.title}
                    </option>
                  ))}
                </Select>
                <SubmitButton pendingLabel="Granting…">Grant access</SubmitButton>
              </form>
              <p className="mt-3 text-xs text-text-secondary">
                Access respects prerequisites; a course only opens once its prerequisites are completed.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "courses" ? (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Add course to program</h2>
            </CardHeader>
            <CardContent>
              <form action={addCourseToProgramAction} className="grid gap-4 lg:grid-cols-[1fr_120px_120px_auto] lg:items-end">
                <input name="redirectTo" type="hidden" value={returnTo} />
                <input name="programId" type="hidden" value={programId} />
                <Select label="Course" name="courseId" required defaultValue="">
                  <option value="" disabled>
                    {courses.length ? "Select a course…" : "Create a course first"}
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </Select>
                <Input label="Order" name="position" type="number" min={1} defaultValue={programCourses.length + 1} />
                <label className="flex h-11 items-center gap-2 text-sm font-medium text-text-secondary">
                  <input className="size-4 accent-primary" defaultChecked name="required" type="checkbox" />
                  Required
                </label>
                <SubmitButton pendingLabel="Adding…">Add course</SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Program courses ({programCourses.length})</h2>
            </CardHeader>
            <CardContent className="grid gap-2">
              {programCourses.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-secondary">No courses in this program yet.</p>
              ) : (
                programCourses.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-sm">
                    <p className="font-semibold text-text-primary">
                      {item.position}. {item.courses?.title}
                    </p>
                    <Badge tone={item.required ? "pink" : "slate"}>{item.required ? "Required" : "Optional"}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "finance" ? (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Update finance clearance</h2>
            </CardHeader>
            <CardContent>
              <form action={updateFinanceClearanceAction} className="grid gap-4 lg:grid-cols-[1fr_130px_1fr_auto] lg:items-end">
                <input name="redirectTo" type="hidden" value={returnTo} />
                <input name="programId" type="hidden" value={programId} />
                <Select label="Student" name="studentId" required defaultValue="">
                  <option value="" disabled>
                    Select a student…
                  </option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {studentLabel(student)}
                    </option>
                  ))}
                </Select>
                <Select label="Status" name="status" required defaultValue="hold">
                  <option value="hold">Hold</option>
                  <option value="cleared">Cleared</option>
                </Select>
                <Input label="Notes" name="notes" placeholder="Finance verification notes" />
                <SubmitButton pendingLabel="Saving…">Save clearance</SubmitButton>
              </form>
              <p className="mt-3 text-sm text-text-secondary">
                Certificates are issued only after all required courses are completed and finance status is cleared.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Clearance status</h2>
            </CardHeader>
            <CardContent className="grid gap-2">
              {programEnrollments.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-secondary">No students assigned yet.</p>
              ) : (
                programEnrollments.map((enrollment) => {
                  const clearance = clearanceByStudent.get(enrollment.student_id);
                  return (
                    <div key={enrollment.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-sm">
                      <div>
                        <p className="font-semibold text-text-primary">{enrollment.profiles?.full_name}</p>
                        {clearance?.notes ? <p className="mt-1 text-xs text-text-secondary">{clearance.notes}</p> : null}
                      </div>
                      <Badge tone={clearance?.status === "cleared" ? "green" : "amber"}>{clearance?.status ?? "hold"}</Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "prerequisites" ? (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Add prerequisite</h2>
            </CardHeader>
            <CardContent>
              <form action={addPrerequisiteAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <input name="redirectTo" type="hidden" value={returnTo} />
                <Select label="Course to unlock" name="courseId" required defaultValue="">
                  <option value="" disabled>
                    {programCourses.length ? "Select a course…" : "Add a course first"}
                  </option>
                  {programCourses.map((item) => (
                    <option key={item.id} value={item.course_id}>
                      {item.courses?.title}
                    </option>
                  ))}
                </Select>
                <Select label="Required prerequisite" name="prerequisiteCourseId" required defaultValue="">
                  <option value="" disabled>
                    Select a course…
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </Select>
                <SubmitButton variant="secondary" pendingLabel="Adding…">
                  Add prerequisite
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Prerequisite rules</h2>
            </CardHeader>
            <CardContent className="grid gap-2">
              {prerequisites.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-secondary">No prerequisite rules affect the courses in this program.</p>
              ) : (
                prerequisites.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-background p-3 text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">{item.course?.title}</span> unlocks after{" "}
                    <span className="font-semibold text-text-primary">{item.prerequisite?.title}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
