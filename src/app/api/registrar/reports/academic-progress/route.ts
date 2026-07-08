import { NextResponse } from "next/server";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateGpa, toCsv } from "@/lib/utils";

type StudentRow = { id: string; full_name: string; email: string };
type GradeRow = { student_id: string; score: number; max_score: number };
type EnrollmentRow = { student_id: string; status: string };

export async function GET() {
  const { profile } = await requireProfile(["registrar", "admin"]);
  const supabase = await createSupabaseServerClient();

  const { data: studentIdentities } = await supabase
    .from("tenant_user_identities")
    .select("user_id,profiles:user_id(full_name,email)")
    .eq("tenant_id", profile.default_tenant_id)
    .eq("role", "student");

  const students: StudentRow[] = (studentIdentities ?? []).map((identity) => {
    const studentProfile = Array.isArray(identity.profiles) ? identity.profiles[0] : identity.profiles;
    return { id: identity.user_id, full_name: studentProfile?.full_name ?? "", email: studentProfile?.email ?? "" };
  });
  const studentIds = students.map((student) => student.id);

  const [{ data: grades }, { data: enrollments }] = await Promise.all([
    studentIds.length
      ? supabase.from("gradebook_entries").select("student_id,score,max_score").in("student_id", studentIds)
      : Promise.resolve({ data: [] as GradeRow[] }),
    studentIds.length
      ? supabase.from("enrollments").select("student_id,status").in("student_id", studentIds)
      : Promise.resolve({ data: [] as EnrollmentRow[] })
  ]);

  const gradesByStudent = new Map<string, GradeRow[]>();
  for (const grade of (grades ?? []) as GradeRow[]) {
    gradesByStudent.set(grade.student_id, [...(gradesByStudent.get(grade.student_id) ?? []), grade]);
  }
  const enrollmentsByStudent = new Map<string, EnrollmentRow[]>();
  for (const enrollment of (enrollments ?? []) as EnrollmentRow[]) {
    enrollmentsByStudent.set(enrollment.student_id, [...(enrollmentsByStudent.get(enrollment.student_id) ?? []), enrollment]);
  }

  const rows = students.map((student) => {
    const studentEnrollments = enrollmentsByStudent.get(student.id) ?? [];
    const gpa = calculateGpa(gradesByStudent.get(student.id) ?? []);
    return {
      student,
      gpa,
      activeCourses: studentEnrollments.filter((enrollment) => enrollment.status === "active").length,
      completedCourses: studentEnrollments.filter((enrollment) => enrollment.status === "completed").length
    };
  });

  const csv = toCsv(rows, [
    ["Student", (row) => row.student.full_name],
    ["Email", (row) => row.student.email],
    ["GPA", (row) => (row.gpa === null ? "" : row.gpa.toFixed(2))],
    ["Active courses", (row) => row.activeCourses],
    ["Completed courses", (row) => row.completedCourses]
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="academic-progress-report.csv"'
    }
  });
}
