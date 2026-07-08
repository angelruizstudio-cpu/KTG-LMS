import { Archive, UserPlus } from "lucide-react";
import Link from "next/link";

import { createStudentAction, unarchiveStudentAction } from "@/app/dashboard/registrar/students/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SubmitButton } from "@/components/ui/submit-button";
import { TableSearch } from "@/components/ui/table-search";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeBannerMessage } from "@/lib/utils";
import type { AcademicStatus } from "@/types/database";

const statusTone: Record<AcademicStatus, "blue" | "green" | "amber" | "slate"> = {
  active: "green",
  inactive: "slate",
  withdrawn: "amber",
  suspended: "amber",
  graduated: "blue"
};

const PAGE_SIZE = 20;

export default async function RegistrarStudentsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string; archived?: string; q?: string; page?: string }>;
}) {
  const { profile } = await requireProfile(["registrar", "admin"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const search = (params.q ?? "").replace(/[,()%_\\]/g, "").trim().slice(0, 60);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let studentsQuery = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "student")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (search) {
    studentsQuery = studentsQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const [{ data: students, count }, { data: identities }, { data: archivedStudents }] = await Promise.all([
    studentsQuery,
    supabase
      .from("tenant_user_identities")
      .select("user_id,institution_user_id")
      .eq("tenant_id", profile.default_tenant_id)
      .eq("role", "student"),
    supabase
      .from("profiles")
      .select("id,full_name,email,archived_at")
      .eq("role", "student")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(20)
  ]);
  const institutionIdByUser = new Map((identities ?? []).map((identity) => [identity.user_id, identity.institution_user_id]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Students</h1>
        <p className="mt-2 text-text-secondary">Create and manage student records for your institution.</p>
      </div>

      {params.error ? <Alert variant="error">{sanitizeBannerMessage(params.error)}</Alert> : null}
      {params.created ? (
        <Alert variant="success" className="font-semibold">
          Student created. Institution ID: <span className="font-mono">{sanitizeBannerMessage(params.created, 40)}</span>
        </Alert>
      ) : null}
      {params.archived ? <Alert variant="success">Student record archived.</Alert> : null}

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <UserPlus size={18} />
            Create student record
          </h2>
        </CardHeader>
        <CardContent>
          <form action={createStudentAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <Input label="Full name" name="fullName" required />
            <Input label="Email" name="email" type="email" required />
            <Input label="Temporary password" name="password" type="password" minLength={8} required />
            <SubmitButton pendingLabel="Creating…">Create</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-text-primary">
            All students{typeof count === "number" ? <span className="ml-2 text-sm font-normal text-text-secondary">({count})</span> : null}
          </h2>
          <div className="sm:w-72">
            <TableSearch action="/dashboard/registrar/students" placeholder="Search by name or email" defaultValue={search} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Institution ID</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(students ?? []).map((student) => (
                <tr key={student.id}>
                  <td className="px-5 py-4 font-semibold text-text-primary">
                    <Link className="hover:text-primary-hover" href={`/dashboard/registrar/students/${student.id}`}>
                      {student.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 font-mono text-text-primary">{institutionIdByUser.get(student.id) ?? "Not issued"}</td>
                  <td className="px-5 py-4 text-text-secondary">{student.email}</td>
                  <td className="px-5 py-4">
                    <Badge tone={statusTone[student.academic_status as AcademicStatus]}>{student.academic_status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(students ?? []).length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-secondary">
              {search ? (
                <>No students match &ldquo;{search}&rdquo;.</>
              ) : (
                "No student records yet. Create the first one with the form above."
              )}
            </p>
          ) : null}
          <Pagination basePath="/dashboard/registrar/students" page={page} totalPages={totalPages} params={{ q: search }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <Archive size={18} />
            Archived students
          </h2>
        </CardHeader>
        <CardContent className="grid gap-3">
          {(archivedStudents ?? []).length === 0 ? (
            <p className="text-sm text-text-secondary">No archived records. Archived students are hidden here but never deleted.</p>
          ) : (
            (archivedStudents ?? []).map((student) => (
              <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                <div>
                  <p className="font-semibold text-text-primary">{student.full_name}</p>
                  <p className="text-sm text-text-secondary">{student.email}</p>
                </div>
                <form action={unarchiveStudentAction}>
                  <input name="studentId" type="hidden" value={student.id} />
                  <SubmitButton size="sm" variant="secondary" pendingLabel="Restoring…">
                    Restore
                  </SubmitButton>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
