import { MessagesSquare, Pin, PinOff } from "lucide-react";
import Link from "next/link";

import {
  createReplyAction,
  createThreadAction,
  deleteReplyAction,
  deleteThreadAction,
  togglePinThreadAction
} from "@/app/dashboard/discussions/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmSubmitButton, SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import type { Database } from "@/types/database";

type ThreadRow = Database["public"]["Tables"]["discussion_threads"]["Row"] & {
  profiles?: { full_name?: string | null } | null;
};
type ReplyRow = Database["public"]["Tables"]["discussion_replies"]["Row"] & {
  profiles?: { full_name?: string | null } | null;
};

export default async function InstructorCourseDiscussionsPage({
  params,
  searchParams
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireProfile(["instructor", "admin"]);
  const { courseId } = await params;
  const { error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const redirectTo = `/dashboard/instructor/courses/${courseId}/discussions`;

  const [{ data: course }, { data: threads }] = await Promise.all([
    supabase.from("courses").select("id,title,created_by").eq("id", courseId).single(),
    supabase
      .from("discussion_threads")
      .select("*, profiles:author_id(full_name)")
      .eq("course_id", courseId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
  ]);

  if (!course) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-text-secondary">Course not found.</p>
        </CardContent>
      </Card>
    );
  }

  const isOwner = course.created_by === profile.id || profile.role === "admin";
  const threadIds = ((threads ?? []) as ThreadRow[]).map((thread) => thread.id);
  const { data: replies } = threadIds.length
    ? await supabase.from("discussion_replies").select("*, profiles:author_id(full_name)").in("thread_id", threadIds).order("created_at")
    : { data: [] as ReplyRow[] };
  const repliesByThread = ((replies ?? []) as ReplyRow[]).reduce<Record<string, ReplyRow[]>>((acc, reply) => {
    acc[reply.thread_id] = [...(acc[reply.thread_id] ?? []), reply];
    return acc;
  }, {});

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
          <MessagesSquare size={22} />
          Discussions — {course.title}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Answer student questions and moderate the conversation. As the course instructor you can pin threads and remove any post.
        </p>
      </div>

      {error ? <p className="rounded-xl bg-error/10 p-3 text-sm font-semibold text-error">{decodeURIComponent(error)}</p> : null}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Start a new thread</h2>
        </CardHeader>
        <CardContent>
          <form action={createThreadAction} className="grid gap-3">
            <input name="courseId" type="hidden" value={course.id} />
            <input name="redirectTo" type="hidden" value={redirectTo} />
            <Input label="Title" name="title" required />
            <Textarea label="Message" name="body" required />
            <SubmitButton className="w-fit">Post thread</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {((threads ?? []) as ThreadRow[]).length === 0 ? (
          <p className="text-sm text-text-secondary">No discussions yet.</p>
        ) : (
          ((threads ?? []) as ThreadRow[]).map((thread) => (
            <Card key={thread.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {thread.pinned ? <Pin className="text-primary-hover" size={16} /> : null}
                      <h3 className="font-semibold text-text-primary">{thread.title}</h3>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      {thread.profiles?.full_name ?? "Unknown"} · {formatDateTime(thread.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isOwner ? (
                      <form action={togglePinThreadAction}>
                        <input name="threadId" type="hidden" value={thread.id} />
                        <input name="pinned" type="hidden" value={String(thread.pinned)} />
                        <input name="redirectTo" type="hidden" value={redirectTo} />
                        <SubmitButton size="sm" variant="secondary">
                          {thread.pinned ? (
                            <>
                              <PinOff size={14} />
                              Unpin
                            </>
                          ) : (
                            <>
                              <Pin size={14} />
                              Pin
                            </>
                          )}
                        </SubmitButton>
                      </form>
                    ) : null}
                    {isOwner || thread.author_id === profile.id ? (
                      <form action={deleteThreadAction}>
                        <input name="threadId" type="hidden" value={thread.id} />
                        <input name="redirectTo" type="hidden" value={redirectTo} />
                        <ConfirmSubmitButton confirmMessage="Delete this thread and all its replies?" size="sm" variant="secondary">
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p className="whitespace-pre-line text-sm text-text-secondary">{thread.body}</p>

                <div className="grid gap-3 border-t border-border pt-3">
                  {(repliesByThread[thread.id] ?? []).map((reply) => (
                    <div key={reply.id} className="rounded-xl bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-text-primary">
                          {reply.profiles?.full_name ?? "Unknown"} <span className="font-normal text-text-secondary">· {formatDateTime(reply.created_at)}</span>
                        </p>
                        {isOwner || reply.author_id === profile.id ? (
                          <form action={deleteReplyAction}>
                            <input name="replyId" type="hidden" value={reply.id} />
                            <input name="redirectTo" type="hidden" value={redirectTo} />
                            <SubmitButton size="sm" variant="ghost">
                              Delete
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">{reply.body}</p>
                    </div>
                  ))}
                </div>

                <form action={createReplyAction} className="grid gap-2">
                  <input name="threadId" type="hidden" value={thread.id} />
                  <input name="redirectTo" type="hidden" value={redirectTo} />
                  <Textarea label="Reply" name="body" placeholder="Write a reply..." required />
                  <SubmitButton className="w-fit" size="sm">
                    Reply
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Link className="w-fit text-sm font-semibold text-primary-hover" href={`/dashboard/instructor/courses/${course.id}`}>
        Back to course
      </Link>
    </div>
  );
}
