import { CalendarRange } from "lucide-react";

import { createAcademicTermAction } from "@/app/dashboard/admin/terms/actions";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, sanitizeBannerMessage } from "@/lib/utils";

export default async function AdminTermsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { profile } = await requireProfile(["admin"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: terms } = await supabase
    .from("academic_terms")
    .select("*")
    .eq("tenant_id", profile.default_tenant_id)
    .order("start_date", { ascending: false, nullsFirst: false });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Academic terms</h1>
        <p className="mt-2 text-text-secondary">
          Every course belongs to a term. Create a term before adding courses for a new semester or session.
        </p>
      </div>

      {params.error ? <Alert variant="error">{sanitizeBannerMessage(params.error)}</Alert> : null}
      {params.created ? <Alert variant="success">Term created: {sanitizeBannerMessage(params.created, 80)}</Alert> : null}

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <CalendarRange size={18} />
            Create term
          </h2>
        </CardHeader>
        <CardContent>
          <form action={createAcademicTermAction} className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
            <Input label="Name" name="name" placeholder="Fall 2026" required />
            <Input label="Start date (optional)" name="startDate" type="date" />
            <Input label="End date (optional)" name="endDate" type="date" />
            <SubmitButton pendingLabel="Creating…">Create term</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">All terms</h2>
        </CardHeader>
        <CardContent className="grid gap-2">
          {(terms ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">No terms yet. Create your first term above.</p>
          ) : (
            (terms ?? []).map((term) => (
              <div key={term.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-sm">
                <p className="font-semibold text-text-primary">{term.name}</p>
                <p className="text-text-secondary">
                  {term.start_date ? formatDate(term.start_date) : "No start date"} –{" "}
                  {term.end_date ? formatDate(term.end_date) : "No end date"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
