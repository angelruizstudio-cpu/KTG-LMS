import Link from "next/link";

import { createCourseAction } from "@/app/dashboard/instructor/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function InstructorCoursesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("created_by", profile.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Courses</h1>
        <p className="mt-2 text-text-secondary">Draft, publish, and maintain your course catalog.</p>
      </div>
      {params.error ? (
        <div className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">{params.error}</div>
      ) : null}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">New course</h2>
        </CardHeader>
        <CardContent>
          <form action={createCourseAction} className="grid gap-4">
            <Input label="Title" name="title" required />
            <Textarea label="Description" name="description" required />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Price in cents" name="priceCents" type="number" min={0} defaultValue={0} />
              <Input label="Stripe price ID" name="stripePriceId" placeholder="price_..." />
            </div>
            <Button className="w-fit" type="submit">
              Create course
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {(courses ?? []).map((course) => (
          <Link key={course.id} href={`/dashboard/instructor/courses/${course.id}`}>
            <Card className="h-full transition hover:border-primary hover:shadow-glow">
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">{course.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">{course.description}</p>
                  </div>
                  <Badge tone={course.status === "published" ? "green" : "amber"}>{course.status}</Badge>
                </div>
                <p className="mt-5 text-sm font-semibold text-text-secondary">{formatCurrency(course.price_cents)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
