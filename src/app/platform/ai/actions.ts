"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePlatformAdmin } from "@/lib/platform-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const knowledgeSchema = z.object({
  title: z.string().min(3),
  category: z.enum(["general", "features", "pricing", "qualification", "objections", "email", "policy"]),
  content: z.string().min(10)
});

const statusSchema = z.object({
  sourceId: z.string().uuid(),
  status: z.enum(["active", "archived"])
});

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createAiKnowledgeSourceAction(formData: FormData) {
  const { user } = await requirePlatformAdmin();
  const parsed = knowledgeSchema.safeParse({
    title: textValue(formData, "title"),
    category: textValue(formData, "category"),
    content: textValue(formData, "content")
  });

  if (!parsed.success) {
    redirect("/platform/ai?error=AI knowledge title, category, and content are required.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("ai_knowledge_sources").insert({
    title: parsed.data.title,
    category: parsed.data.category,
    content: parsed.data.content,
    status: "active",
    created_by: user.id
  });

  if (error) {
    redirect(`/platform/ai?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/platform/ai");
  redirect("/platform/ai?created=1");
}

export async function updateAiKnowledgeStatusAction(formData: FormData) {
  await requirePlatformAdmin();
  const parsed = statusSchema.safeParse({
    sourceId: formData.get("sourceId"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    redirect("/platform/ai?error=Invalid AI knowledge source.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("ai_knowledge_sources").update({ status: parsed.data.status }).eq("id", parsed.data.sourceId);

  if (error) {
    redirect(`/platform/ai?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/platform/ai");
  redirect("/platform/ai?updated=1");
}
