import { NextResponse } from "next/server";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/utils";

type ProgramEnrollmentRow = {
  program_id: string;
  student_id: string;
  programs?: { name?: string | null } | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

export async function GET() {
  const { profile } = await requireProfile(["registrar", "admin"]);
  const supabase = await createSupabaseServerClient();

  const { data: tenantPrograms } = await supabase.from("programs").select("id").eq("tenant_id", profile.default_tenant_id);
  const programIds = (tenantPrograms ?? []).map((program) => program.id);

  const { data: programEnrollments } = programIds.length
    ? await supabase
        .from("program_enrollments")
        .select("program_id,student_id,programs(name),profiles:student_id(full_name,email)")
        .in("program_id", programIds)
        .eq("status", "active")
    : { data: [] as ProgramEnrollmentRow[] };

  const rows = await Promise.all(
    ((programEnrollments ?? []) as ProgramEnrollmentRow[]).map(async (enrollment) => {
      const [{ data: requiredCourses }, { data: financeClearance }, { data: existingCertificate }] = await Promise.all([
        supabase.from("program_courses").select("course_id").eq("program_id", enrollment.program_id).eq("required", true),
        supabase
          .from("finance_clearances")
          .select("status")
          .eq("program_id", enrollment.program_id)
          .eq("student_id", enrollment.student_id)
          .maybeSingle(),
        supabase
          .from("program_certificates")
          .select("id")
          .eq("program_id", enrollment.program_id)
          .eq("student_id", enrollment.student_id)
          .maybeSingle()
      ]);

      const requiredCourseIds = (requiredCourses ?? []).map((course) => course.course_id);
      const { data: completedEnrollments } = requiredCourseIds.length
        ? await supabase
            .from("enrollments")
            .select("course_id")
            .eq("student_id", enrollment.student_id)
            .eq("status", "completed")
            .in("course_id", requiredCourseIds)
        : { data: [] as { course_id: string }[] };
      const completedIds = new Set((completedEnrollments ?? []).map((row) => row.course_id));
      const missingCount = requiredCourseIds.filter((courseId) => !completedIds.has(courseId)).length;

      let reason = "Eligible";
      if (existingCertificate) reason = "Certificate already issued";
      else if (!requiredCourseIds.length) reason = "Program has no required courses configured";
      else if (missingCount > 0) reason = `${missingCount} required course(s) not completed`;
      else if (financeClearance?.status !== "cleared") reason = "Finance not cleared";

      return {
        student: enrollment.profiles?.full_name ?? "",
        email: enrollment.profiles?.email ?? "",
        program: enrollment.programs?.name ?? "",
        eligible: reason === "Eligible",
        reason
      };
    })
  );

  const csv = toCsv(rows, [
    ["Student", (row) => row.student],
    ["Email", (row) => row.email],
    ["Program", (row) => row.program],
    ["Eligible", (row) => (row.eligible ? "Yes" : "No")],
    ["Reason", (row) => row.reason]
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="graduation-eligibility-report.csv"'
    }
  });
}
