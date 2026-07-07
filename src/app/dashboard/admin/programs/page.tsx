import { ArrowRight, FolderPlus } from "lucide-react";
import Link from "next/link";

import { createProgramAction } from "@/app/dashboard/admin/programs/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SubmitButton } from "@/components/ui/submit-button";
import { TableSearch } from "@/components/ui/table-search";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sanitizeBannerMessage } from "@/lib/utils";

type Program = { id: string; name: string; description: string | null; active: boolean };

const PAGE_SIZE = 10;

export default async function AdminProgramsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string; q?: string; page?: string }>;
}) {
  const { profile } = await requireProfile(["admin"]);
  const params = await searchParams;
  const supabase = createSupabaseAdminClient();

  const search = (params.q ?? "").replace(/[,()%_\\]/g, "").trim().slice(0, 60);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let programsQuery = supabase
    .from("programs")
    .select("id,name,description,active", { count: "exact" })
    .eq("tenant_id", profile.default_tenant_id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (search) {
    programsQuery = programsQuery.ilike("name", `%${search}%`);
  }

  const { data: programsData, count } = await programsQuery;
  const programs = (programsData ?? []) as Program[];
  const programIds = programs.map((program) => program.id);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Summary counts for just the programs on this page.
  const [{ data: courseRows }, { data: enrollmentRows }] = await Promise.all([
    programIds.length
      ? supabase.from("program_courses").select("program_id").in("program_id", programIds)
      : Promise.resolve({ data: [] as { program_id: string }[] }),
    programIds.length
      ? supabase.from("program_enrollments").select("program_id").in("program_id", programIds).eq("status", "active")
      : Promise.resolve({ data: [] as { program_id: string }[] })
  ]);
  const courseCounts = new Map<string, number>();
  for (const row of courseRows ?? []) {
    courseCounts.set(row.program_id, (courseCounts.get(row.program_id) ?? 0) + 1);
  }
  const studentCounts = new Map<string, number>();
  for (const row of enrollmentRows ?? []) {
    studentCounts.set(row.program_id, (studentCounts.get(row.program_id) ?? 0) + 1);
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Programs</h1>
        <p className="mt-2 text-text-secondary">
          Open a program to manage its courses, students, finance clearance, and certificates.
        </p>
      </div>

      {params.error ? <Alert variant="error">{sanitizeBannerMessage(params.error)}</Alert> : null}
      {params.created ? (
        <Alert variant="success" className="font-semibold">
          Program created: {sanitizeBannerMessage(params.created, 80)}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <FolderPlus size={18} />
            Create program
          </h2>
        </CardHeader>
        <CardContent>
          <form action={createProgramAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Input label="Program name" name="name" placeholder="Biblical Leadership Program" required />
            <Textarea label="Description" name="description" />
            <SubmitButton pendingLabel="Creating…">Create program</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-text-primary">
            All programs{typeof count === "number" ? <span className="ml-2 text-sm font-normal text-text-secondary">({count})</span> : null}
          </h2>
          <div className="sm:w-72">
            <TableSearch action="/dashboard/admin/programs" placeholder="Search by name" defaultValue={search} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {programs.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-secondary">
              {search ? `No programs match “${search}”.` : "No programs yet. Create your first program above."}
            </p>
          ) : (
            programs.map((program) => (
              <Link
                key={program.id}
                href={`/dashboard/admin/programs/${program.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4 transition hover:border-primary hover:shadow-glow"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-text-primary">{program.name}</h3>
                    <Badge tone={program.active ? "green" : "slate"}>{program.active ? "active" : "inactive"}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-text-secondary">{program.description || "No description yet."}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {courseCounts.get(program.id) ?? 0} course{(courseCounts.get(program.id) ?? 0) === 1 ? "" : "s"} ·{" "}
                    {studentCounts.get(program.id) ?? 0} student{(studentCounts.get(program.id) ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <ArrowRight aria-hidden className="size-5 shrink-0 text-text-secondary" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Pagination basePath="/dashboard/admin/programs" page={page} totalPages={totalPages} params={{ q: search }} />
    </div>
  );
}
