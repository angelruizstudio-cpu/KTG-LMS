"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

// Shared between the student and instructor course-discussions pages — both roles can start
// threads/reply, only the thread author or the course's instructor can moderate (pin/delete). RLS
// (migration 020_discussions.sql) is the actual authorization boundary; requireProfile() here only
// keeps unauthenticated/wrong-role users away from the form endpoints.

function discussionsReturnPath(formData: FormData) {
  const raw = formData.get("redirectTo");
  return safeNextPath(typeof raw === "string" ? raw : undefined, "/dashboard");
}

const createThreadSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(3),
  body: z.string().min(1)
});

export async function createThreadAction(formData: FormData) {
  const { profile } = await requireProfile(["student", "instructor", "admin", "registrar"]);
  const returnPath = discussionsReturnPath(formData);
  const parsed = createThreadSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    body: formData.get("body")
  });

  if (!parsed.success) {
    redirect(`${returnPath}?error=${encodeURIComponent("Thread details are invalid.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("discussion_threads").insert({
    course_id: parsed.data.courseId,
    author_id: profile.id,
    title: parsed.data.title,
    body: parsed.data.body
  });

  if (error) {
    redirect(`${returnPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(returnPath);
}

const createReplySchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().min(1)
});

export async function createReplyAction(formData: FormData) {
  const { profile } = await requireProfile(["student", "instructor", "admin", "registrar"]);
  const returnPath = discussionsReturnPath(formData);
  const parsed = createReplySchema.safeParse({
    threadId: formData.get("threadId"),
    body: formData.get("body")
  });

  if (!parsed.success) {
    redirect(`${returnPath}?error=${encodeURIComponent("Reply is invalid.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("discussion_replies").insert({
    thread_id: parsed.data.threadId,
    author_id: profile.id,
    body: parsed.data.body
  });

  if (error) {
    redirect(`${returnPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(returnPath);
}

const threadIdSchema = z.object({ threadId: z.string().uuid() });

export async function togglePinThreadAction(formData: FormData) {
  await requireProfile(["instructor", "admin"]);
  const returnPath = discussionsReturnPath(formData);
  const parsed = threadIdSchema.safeParse({ threadId: formData.get("threadId") });
  const pinned = formData.get("pinned") === "true";

  if (!parsed.success) {
    redirect(`${returnPath}?error=${encodeURIComponent("Unable to update thread.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("discussion_threads")
    .update({ pinned: !pinned })
    .eq("id", parsed.data.threadId);

  if (error) {
    redirect(`${returnPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(returnPath);
}

export async function deleteThreadAction(formData: FormData) {
  await requireProfile(["student", "instructor", "admin", "registrar"]);
  const returnPath = discussionsReturnPath(formData);
  const parsed = threadIdSchema.safeParse({ threadId: formData.get("threadId") });

  if (!parsed.success) {
    redirect(`${returnPath}?error=${encodeURIComponent("Unable to delete thread.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("discussion_threads").delete().eq("id", parsed.data.threadId);

  if (error) {
    redirect(`${returnPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(returnPath);
}

const replyIdSchema = z.object({ replyId: z.string().uuid() });

export async function deleteReplyAction(formData: FormData) {
  await requireProfile(["student", "instructor", "admin", "registrar"]);
  const returnPath = discussionsReturnPath(formData);
  const parsed = replyIdSchema.safeParse({ replyId: formData.get("replyId") });

  if (!parsed.success) {
    redirect(`${returnPath}?error=${encodeURIComponent("Unable to delete reply.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("discussion_replies").delete().eq("id", parsed.data.replyId);

  if (error) {
    redirect(`${returnPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(returnPath);
}
