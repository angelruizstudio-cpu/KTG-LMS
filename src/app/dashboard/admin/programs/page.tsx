import {
  addCourseToProgramAction,
  addPrerequisiteAction,
  assignStudentToProgramAction,
  createProgramAction,
  grantEligibleProgramAccessAction,
  grantCourseAccessAction,
  issueProgramCertificateAction,
  updateFinanceClearanceAction
} from "@/app/dashboard/admin/programs/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type Program = { id: string; name: string; description: string | null; active: boolean };
type Course = { id: string; title: string; status: string };
type Student = { id: string; full_name: string; email: string; institution_user_id?: string };
type ProgramCourseWithCourse = {
  id: string;
  program_id: string;
  course_id: string;
  position: number;
  required: boolean;
  courses?: { title?: string | null; status?: string | null } | null;
};
type ProgramEnrollmentWithProfile = {
  id: string;
  program_id: string;
  student_id: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};
type PrerequisiteWithNames = {
  id: string;
  prerequisite?: { title?: string | null } | null;
  course?: { title?: string | null } | null;
};
type FinanceClearance = {
  id: string;
  program_id: string;
  student_id: string;
  status: "hold" | "cleared";
  notes: string | null;
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

export default async function AdminProgramsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; access?: string; created?: string }>;
}) {
  const { profile } = await requireProfile(["admin"]);
  const params = await searchParams;
  const supabase = createSupabaseAdminClient();
  const [
    programsResult,
    coursesResult,
    studentIdentitiesResult
  ] = await Promise.all([
      supabase.from("programs").select("*").eq("tenant_id", profile.default_tenant_id).order("created_at", { ascending: false }),
      supabase.from("courses").select("id,title,status").eq("tenant_id", profile.default_tenant_id).order("title"),
      supabase
        .from("tenant_user_identities")
        .select("user_id,institution_user_id,profiles:user_id(full_name,email)")
        .eq("tenant_id", profile.default_tenant_id)
        .eq("role", "student")
        .eq("status", "active")
        .order("institution_user_id")
    ]);
  const programs = (programsResult.data ?? []) as Program[];
  const courses = (coursesResult.data ?? []) as Course[];
  const tenantProgramIds = programs.map((program) => program.id);
  const tenantCourseIds = courses.map((course) => course.id);
  const [
    programCoursesResult,
    programEnrollmentsResult,
    prerequisitesResult,
    financeClearancesResult,
    programCertificatesResult,
    courseEnrollmentsResult
  ] = await Promise.all([
      tenantProgramIds.length
        ? supabase.from("program_courses").select("*, courses(title,status)").in("program_id", tenantProgramIds).order("position")
        : Promise.resolve({ data: [], error: null }),
      tenantProgramIds.length
        ? supabase
            .from("program_enrollments")
            .select("*, profiles:student_id(full_name,email)")
            .in("program_id", tenantProgramIds)
            .order("enrolled_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      tenantCourseIds.length
        ? supabase
            .from("course_prerequisites")
            .select("*, prerequisite:prerequisite_course_id(title), course:course_id(title)")
            .in("course_id", tenantCourseIds)
        : Promise.resolve({ data: [], error: null }),
      tenantProgramIds.length ? supabase.from("finance_clearances").select("*").in("program_id", tenantProgramIds) : Promise.resolve({ data: [], error: null }),
      tenantProgramIds.length ? supabase.from("program_certificates").select("*").in("program_id", tenantProgramIds) : Promise.resolve({ data: [], error: null }),
      tenantCourseIds.length ? supabase.from("enrollments").select("course_id,student_id,status").in("course_id", tenantCourseIds) : Promise.resolve({ data: [], error: null })
    ]);
  const dataErrors = [
    programsResult.error?.message,
    coursesResult.error?.message,
    studentIdentitiesResult.error?.message,
    programCoursesResult.error?.message,
    programEnrollmentsResult.error?.message,
    prerequisitesResult.error?.message,
    financeClearancesResult.error?.message,
    programCertificatesResult.error?.message,
    courseEnrollmentsResult.error?.message
  ].filter(Boolean);
  const programCourses = (programCoursesResult.data ?? []) as ProgramCourseWithCourse[];
  const programEnrollments = (programEnrollmentsResult.data ?? []) as ProgramEnrollmentWithProfile[];
  const prerequisites = (prerequisitesResult.data ?? []) as PrerequisiteWithNames[];
  const financeClearances = (financeClearancesResult.data ?? []) as FinanceClearance[];
  const programCertificates = (programCertificatesResult.data ?? []) as ProgramCertificate[];
  const courseEnrollments = (courseEnrollmentsResult.data ?? []) as CourseEnrollment[];
  const students: Student[] = (studentIdentitiesResult.data ?? []).map((identity) => {
    const studentProfile = Array.isArray(identity.profiles) ? identity.profiles[0] : identity.profiles;

    return {
      id: identity.user_id,
      full_name: studentProfile?.full_name ?? "Unknown student",
      email: studentProfile?.email ?? "No email",
      institution_user_id: identity.institution_user_id
    };
  });
  const clearanceByProgramStudent = new Map(
    ((financeClearances ?? []) as FinanceClearance[]).map((clearance) => [`${clearance.program_id}:${clearance.student_id}`, clearance])
  );
  const certificateByProgramStudent = new Map(
    ((programCertificates ?? []) as ProgramCertificate[]).map((certificate) => [`${certificate.program_id}:${certificate.student_id}`, certificate])
  );
  const courseEnrollmentsByStudent = ((courseEnrollments ?? []) as CourseEnrollment[]).reduce<Record<string, CourseEnrollment[]>>(
    (acc, enrollment) => {
      acc[enrollment.student_id] = [...(acc[enrollment.student_id] ?? []), enrollment];
      return acc;
    },
    {}
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Programs</h1>
        <p className="mt-2 text-text-secondary">
          Assign students to academic programs and grant course access based on availability and prerequisites.
        </p>
      </div>

      {params.error ? (
        <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">{params.error}</div>
      ) : null}
      {dataErrors.length ? (
        <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">
          Unable to load program data: {dataErrors.join(" ")}
        </div>
      ) : null}
      {params.access ? (
        <div className="rounded-xl border border-success bg-success-light px-3 py-2 text-sm font-semibold text-success">
          Opened {params.access} eligible course{params.access === "1" ? "" : "s"} for the selected student.
        </div>
      ) : null}
      {params.created ? (
        <div className="rounded-xl border border-success bg-success-light px-3 py-2 text-sm font-semibold text-success">
          Program created: {params.created}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Create program</h2>
          </CardHeader>
          <CardContent>
            <form action={createProgramAction} className="grid gap-4">
              <Input label="Program name" name="name" placeholder="Biblical Leadership Program" required />
              <Textarea label="Description" name="description" />
              <Button className="w-fit" type="submit">
                Create program
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Assign student to program</h2>
          </CardHeader>
          <CardContent>
            <form action={assignStudentToProgramAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <SelectField emptyLabel="Create a program first" label="Program" name="programId" options={programs.map((program) => [program.id, program.name])} />
              <SelectField
                label="Student"
                name="studentId"
                options={students.map((student) => [
                  student.id,
                  `${student.institution_user_id ?? "ID"} - ${student.full_name} (${student.email})`
                ])}
              />
              <Button type="submit">Assign</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Program course rules</h2>
        </CardHeader>
        <CardContent className="grid gap-5">
          <form action={addCourseToProgramAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_120px_120px_auto] lg:items-end">
            <SelectField emptyLabel="Create a program first" label="Program" name="programId" options={programs.map((program) => [program.id, program.name])} />
            <SelectField emptyLabel="Create a course first" label="Course" name="courseId" options={courses.map((course) => [course.id, course.title])} />
            <Input label="Order" name="position" type="number" min={1} defaultValue={1} />
            <label className="flex h-11 items-center gap-2 text-sm font-medium text-text-secondary">
              <input className="size-4 accent-primary" defaultChecked name="required" type="checkbox" />
              Required
            </label>
            <Button type="submit">Add course</Button>
          </form>

          <form action={addPrerequisiteAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <SelectField emptyLabel="Create a course first" label="Course to unlock" name="courseId" options={courses.map((course) => [course.id, course.title])} />
            <SelectField
              emptyLabel="Create a course first"
              label="Required prerequisite"
              name="prerequisiteCourseId"
              options={courses.map((course) => [course.id, course.title])}
            />
            <Button type="submit" variant="secondary">
              Add prerequisite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Grant course access</h2>
        </CardHeader>
        <CardContent>
          <form action={grantCourseAccessAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <SelectField
              label="Student"
              name="studentId"
              options={students.map((student) => [
                student.id,
                `${student.institution_user_id ?? "ID"} - ${student.full_name} (${student.email})`
              ])}
            />
            <SelectField emptyLabel="Create a course first" label="Course" name="courseId" options={courses.map((course) => [course.id, course.title])} />
            <Button type="submit">Grant access</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Finance clearance</h2>
        </CardHeader>
        <CardContent>
          <form action={updateFinanceClearanceAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_130px_1fr_auto] lg:items-end">
            <SelectField emptyLabel="Create a program first" label="Program" name="programId" options={programs.map((program) => [program.id, program.name])} />
            <SelectField
              label="Student"
              name="studentId"
              options={students.map((student) => [
                student.id,
                `${student.institution_user_id ?? "ID"} - ${student.full_name} (${student.email})`
              ])}
            />
            <label className="grid gap-2 text-sm font-medium text-text-secondary">
              Status
              <select className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary" name="status" required>
                <option value="hold">Hold</option>
                <option value="cleared">Cleared</option>
              </select>
            </label>
            <Input label="Notes" name="notes" placeholder="Finance verification notes" />
            <Button type="submit">Save clearance</Button>
          </form>
          <p className="mt-3 text-sm text-text-secondary">
            Certificates are issued only after all required program courses are completed and finance status is cleared.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {((programs ?? []) as Program[]).map((program) => (
          <Card key={program.id}>
            <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold text-text-primary">{program.name}</h2>
                <p className="mt-1 text-sm text-text-secondary">{program.description || "No description yet."}</p>
              </div>
              <Badge tone={program.active ? "green" : "slate"}>{program.active ? "active" : "inactive"}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">Courses</p>
                <div className="grid gap-2">
                  {((programCourses ?? []) as ProgramCourseWithCourse[])
                    .filter((item) => item.program_id === program.id)
                    .map((item) => (
                      <div key={item.id} className="rounded-xl border border-border bg-background p-3 text-sm">
                        <p className="font-semibold text-text-primary">
                          {item.position}. {item.courses?.title}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">{item.required ? "Required" : "Optional"}</p>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">Students</p>
                <div className="grid gap-2">
                  {((programEnrollments ?? []) as ProgramEnrollmentWithProfile[])
                    .filter((item) => item.program_id === program.id)
                    .map((item) => {
                      const clearance = clearanceByProgramStudent.get(`${program.id}:${item.student_id}`);
                      const certificate = certificateByProgramStudent.get(`${program.id}:${item.student_id}`);
                      const programCourseIds = ((programCourses ?? []) as ProgramCourseWithCourse[])
                        .filter((programCourse) => programCourse.program_id === program.id)
                        .map((programCourse) => programCourse.course_id);
                      const studentCourseEnrollments = (courseEnrollmentsByStudent[item.student_id] ?? []).filter((enrollment) =>
                        programCourseIds.includes(enrollment.course_id)
                      );
                      const activeCourses = studentCourseEnrollments.filter((enrollment) => enrollment.status === "active").length;
                      const completedCourses = studentCourseEnrollments.filter((enrollment) => enrollment.status === "completed").length;

                      return (
                      <div key={item.id} className="grid gap-3 rounded-xl border border-border bg-background p-3 text-sm">
                        <div>
                          <p className="font-semibold text-text-primary">{item.profiles?.full_name}</p>
                          <p className="mt-1 text-xs text-text-secondary">{item.profiles?.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={clearance?.status === "cleared" ? "green" : "amber"}>
                            finance {clearance?.status ?? "hold"}
                          </Badge>
                          <Badge tone={certificate ? "green" : "slate"}>
                            {certificate ? "certificate issued" : "no certificate"}
                          </Badge>
                          <Badge tone="blue">
                            {activeCourses} active / {completedCourses} completed
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={grantEligibleProgramAccessAction}>
                            <input name="programId" type="hidden" value={program.id} />
                            <input name="studentId" type="hidden" value={item.student_id} />
                            <Button size="sm" type="submit">
                              Open eligible courses
                            </Button>
                          </form>
                          <form action={issueProgramCertificateAction}>
                            <input name="programId" type="hidden" value={program.id} />
                            <input name="studentId" type="hidden" value={item.student_id} />
                            <Button disabled={Boolean(certificate)} size="sm" type="submit" variant="secondary">
                              Issue certificate
                            </Button>
                          </form>
                        </div>
                      </div>
                    );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Prerequisite rules</h2>
        </CardHeader>
        <CardContent className="grid gap-2">
          {(prerequisites ?? []).length ? (
            ((prerequisites ?? []) as PrerequisiteWithNames[]).map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-background p-3 text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">{item.course?.title}</span> unlocks after{" "}
                <span className="font-semibold text-text-primary">{item.prerequisite?.title}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-secondary">No prerequisite rules yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SelectField({
  emptyLabel = "Select...",
  label,
  name,
  options
}: {
  emptyLabel?: string;
  label: string;
  name: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-text-secondary">
      {label}
      <select className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary" name={name} required>
        <option value="">{options.length ? "Select..." : emptyLabel}</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
