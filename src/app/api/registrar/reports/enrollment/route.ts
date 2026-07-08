import { NextResponse } from "next/server";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/utils";

type EnrollmentRow = {
  status: string;
  progress_percent: number;
  enrolled_at: string;
  courses?: { title?: string | null } | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

export async function GET() {
  const { profile } = await requireProfile(["registrar", "admin"]);
  const supabase = await createSupabaseServerClient();

  const { data: tenantCourses } = await supabase.from("courses").select("id").eq("tenant_id", profile.default_tenant_id);
  const courseIds = (tenantCourses ?? []).map((course) => course.id);

  const { data } = courseIds.length
    ? await supabase
        .from("enrollments")
        .select("status,progress_percent,enrolled_at,courses(title),profiles:student_id(full_name,email)")
        .in("course_id", courseIds)
        .order("enrolled_at", { ascending: false })
    : { data: [] as EnrollmentRow[] };

  const csv = toCsv(data as EnrollmentRow[], [
    ["Student", (row) => row.profiles?.full_name ?? ""],
    ["Email", (row) => row.profiles?.email ?? ""],
    ["Course", (row) => row.courses?.title ?? ""],
    ["Status", (row) => row.status],
    ["Progress %", (row) => row.progress_percent],
    ["Enrolled at", (row) => row.enrolled_at]
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="enrollment-report.csv"'
    }
  });
}
