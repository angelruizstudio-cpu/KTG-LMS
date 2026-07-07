import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { TableSearch } from "@/components/ui/table-search";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminCourse = {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

const PAGE_SIZE = 12;

export default async function AdminCoursesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireProfile(["admin"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const search = (params.q ?? "").replace(/[,()%_\\]/g, "").trim().slice(0, 60);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let coursesQuery = supabase
    .from("courses")
    .select("*, profiles:created_by(full_name,email)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (search) {
    coursesQuery = coursesQuery.ilike("title", `%${search}%`);
  }

  const { data: courses, count } = await coursesQuery;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Courses</h1>
          <p className="mt-2 text-text-secondary">Review courses before adding them to programs and granting access.</p>
        </div>
        <div className="sm:w-72">
          <TableSearch action="/dashboard/admin/courses" placeholder="Search by title" defaultValue={search} />
        </div>
      </div>
      {(courses ?? []).length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-5 py-10 text-center text-sm text-text-secondary shadow-soft">
          {search ? `No courses match “${search}”.` : "No courses yet."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {((courses ?? []) as AdminCourse[]).map((course) => (
            <Link key={course.id} href={`/dashboard/instructor/courses/${course.id}`}>
              <Card className="h-full transition hover:border-primary hover:shadow-glow">
                <CardContent>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">{course.title}</h2>
                      <p className="mt-2 text-sm text-text-secondary">By {course.profiles?.full_name ?? "Instructor"}</p>
                    </div>
                    <Badge tone={course.status === "published" ? "green" : "amber"}>{course.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Pagination basePath="/dashboard/admin/courses" page={page} totalPages={totalPages} params={{ q: search }} />
    </div>
  );
}
