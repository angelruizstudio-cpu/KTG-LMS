import { NextResponse } from "next/server";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/utils";

type CertificateRow = {
  certificate_number: string;
  issued_at: string;
  programs?: { name?: string | null } | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

export async function GET() {
  const { profile } = await requireProfile(["registrar", "admin"]);
  const supabase = await createSupabaseServerClient();

  const { data: tenantPrograms } = await supabase.from("programs").select("id").eq("tenant_id", profile.default_tenant_id);
  const programIds = (tenantPrograms ?? []).map((program) => program.id);

  const { data: certificates } = programIds.length
    ? await supabase
        .from("program_certificates")
        .select("certificate_number,issued_at,programs(name),profiles:student_id(full_name,email)")
        .in("program_id", programIds)
        .order("issued_at", { ascending: false })
    : { data: [] as CertificateRow[] };

  const csv = toCsv((certificates ?? []) as CertificateRow[], [
    ["Student", (row) => row.profiles?.full_name ?? ""],
    ["Email", (row) => row.profiles?.email ?? ""],
    ["Program", (row) => row.programs?.name ?? ""],
    ["Certificate number", (row) => row.certificate_number],
    ["Issued at", (row) => row.issued_at]
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="completions-report.csv"'
    }
  });
}
