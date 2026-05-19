import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GradebookEntry = {
  id: string;
  item_name: string;
  score: number;
  max_score: number;
  feedback: string | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
  courses?: { title?: string | null } | null;
};

export default async function InstructorGradebookPage() {
  await requireProfile(["instructor", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: entries } = await supabase
    .from("gradebook_entries")
    .select("*, profiles:student_id(full_name,email), courses(title)")
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Gradebook</h1>
        <p className="mt-2 text-text-secondary">Quiz and assignment scores across enrolled students.</p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Recent grades</h2>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {((entries ?? []) as GradebookEntry[]).map((entry) => (
                <tr key={entry.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-text-primary">{entry.profiles?.full_name ?? "Student"}</p>
                    <p className="text-xs text-text-secondary">{entry.profiles?.email}</p>
                  </td>
                  <td className="px-5 py-4 text-text-secondary">{entry.courses?.title}</td>
                  <td className="px-5 py-4 text-text-secondary">{entry.item_name}</td>
                  <td className="px-5 py-4 font-semibold text-text-primary">
                    {entry.score}/{entry.max_score}
                  </td>
                  <td className="px-5 py-4 text-text-secondary">{entry.feedback ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
