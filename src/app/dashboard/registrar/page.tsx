import { Award, GraduationCap, UsersRound } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RegistrarDashboardPage() {
  await requireProfile(["registrar", "admin"]);
  const supabase = await createSupabaseServerClient();

  const [{ count: students }, { count: activeEnrollments }, { count: certificates }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("program_certificates").select("*", { count: "exact", head: true })
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Registrar</h1>
        <p className="mt-2 text-text-secondary">Student records, enrollment, and academic history for your institution.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Students", value: students ?? 0, Icon: UsersRound },
          { label: "Active enrollments", value: activeEnrollments ?? 0, Icon: GraduationCap },
          { label: "Certificates issued", value: certificates ?? 0, Icon: Award }
        ].map(({ label, value, Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-secondary">{label}</p>
                <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
              </div>
              <Icon className="text-secondary" size={28} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Coming soon</h2>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-text-secondary">
          <p>Student record management, enrollment tools, transcripts, and institutional reports are being built next.</p>
          <p>Your role already has read access to student profiles, enrollments, certificates, and gradebook data.</p>
        </CardContent>
      </Card>
    </div>
  );
}
