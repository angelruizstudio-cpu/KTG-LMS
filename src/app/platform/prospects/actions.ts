"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { analyzeInstitutionProspect } from "@/lib/prospect-ai";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const prospectStatusValues = [
  "new",
  "contacted",
  "demo_scheduled",
  "demo_completed",
  "proposal_sent",
  "negotiation",
  "won",
  "lost"
] as const;

const prospectSchema = z.object({
  institutionName: z.string().min(2),
  institutionType: z.enum(["church", "bible_institute", "seminary", "school", "ministry", "nonprofit", "other"]),
  contactName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  estimatedStudents: z.number().int().min(0).nullable(),
  programsNeeded: z.string().optional(),
  painPoints: z.string().optional(),
  source: z.string().optional()
});

const statusSchema = z.object({
  prospectId: z.string().uuid(),
  status: z.enum(prospectStatusValues)
});

const interactionSchema = z.object({
  prospectId: z.string().uuid(),
  interactionType: z.enum(["note", "call", "email", "meeting", "demo", "proposal", "task"]),
  content: z.string().min(2)
});

const reanalyzeSchema = z.object({
  prospectId: z.string().uuid()
});

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function numberValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value ? Number(value) : null;
}

export async function createProspectAction(formData: FormData) {
  const { user } = await requirePlatformAdmin();

  const parsed = prospectSchema.safeParse({
    institutionName: textValue(formData, "institutionName"),
    institutionType: textValue(formData, "institutionType") ?? "other",
    contactName: textValue(formData, "contactName"),
    email: textValue(formData, "email"),
    phone: textValue(formData, "phone"),
    country: textValue(formData, "country"),
    city: textValue(formData, "city"),
    estimatedStudents: numberValue(formData, "estimatedStudents"),
    programsNeeded: textValue(formData, "programsNeeded"),
    painPoints: textValue(formData, "painPoints"),
    source: textValue(formData, "source") ?? "manual"
  });

  if (!parsed.success) {
    redirect("/platform/prospects?error=Prospect details are required.");
  }

  const analysis = await analyzeInstitutionProspect({
    institutionName: parsed.data.institutionName,
    institutionType: parsed.data.institutionType,
    contactName: parsed.data.contactName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    country: parsed.data.country,
    city: parsed.data.city,
    estimatedStudents: parsed.data.estimatedStudents,
    programsNeeded: parsed.data.programsNeeded,
    painPoints: parsed.data.painPoints,
    source: parsed.data.source
  });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("institution_prospects").insert({
    institution_name: parsed.data.institutionName,
    institution_type: parsed.data.institutionType,
    contact_name: parsed.data.contactName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    country: parsed.data.country,
    city: parsed.data.city,
    estimated_students: parsed.data.estimatedStudents,
    programs_needed: parsed.data.programsNeeded,
    pain_points: parsed.data.painPoints,
    source: parsed.data.source,
    status: "new",
    ai_score: analysis.score,
    ai_priority: analysis.priority,
    ai_summary: analysis.summary,
    ai_next_action: analysis.nextAction,
    ai_email_draft: analysis.emailDraft,
    created_by: user.id
  });

  if (error) {
    redirect(`/platform/prospects?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/platform/prospects");
  redirect("/platform/prospects?created=1");
}

export async function updateProspectStatusAction(formData: FormData) {
  await requirePlatformAdmin();

  const parsed = statusSchema.safeParse({
    prospectId: formData.get("prospectId"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    redirect("/platform/prospects?error=Invalid prospect status.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("institution_prospects").update({ status: parsed.data.status }).eq("id", parsed.data.prospectId);

  if (error) {
    redirect(`/platform/prospects?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/platform/prospects");
  redirect("/platform/prospects?updated=1");
}

export async function addProspectInteractionAction(formData: FormData) {
  const { user } = await requirePlatformAdmin();

  const parsed = interactionSchema.safeParse({
    prospectId: formData.get("prospectId"),
    interactionType: formData.get("interactionType"),
    content: formData.get("content")
  });

  if (!parsed.success) {
    redirect("/platform/prospects?error=Interaction note is required.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("institution_prospect_interactions").insert({
    prospect_id: parsed.data.prospectId,
    interaction_type: parsed.data.interactionType,
    content: parsed.data.content,
    created_by: user.id
  });

  if (error) {
    redirect(`/platform/prospects?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/platform/prospects");
  redirect("/platform/prospects?updated=1");
}

export async function reanalyzeProspectAction(formData: FormData) {
  await requirePlatformAdmin();

  const parsed = reanalyzeSchema.safeParse({
    prospectId: formData.get("prospectId")
  });

  if (!parsed.success) {
    redirect("/platform/prospects?error=Invalid prospect.");
  }

  const admin = createSupabaseAdminClient();
  const { data: prospect, error: loadError } = await admin
    .from("institution_prospects")
    .select(
      "id,institution_name,institution_type,country,city,contact_name,contact_role,email,phone,estimated_students,estimated_instructors,programs_needed,pain_points,budget_range,source"
    )
    .eq("id", parsed.data.prospectId)
    .single();

  if (loadError || !prospect) {
    redirect(`/platform/prospects?error=${encodeURIComponent(loadError?.message ?? "Prospect not found.")}`);
  }

  const analysis = await analyzeInstitutionProspect({
    institutionName: prospect.institution_name,
    institutionType: prospect.institution_type,
    country: prospect.country,
    city: prospect.city,
    contactName: prospect.contact_name,
    contactRole: prospect.contact_role,
    email: prospect.email,
    phone: prospect.phone,
    estimatedStudents: prospect.estimated_students,
    estimatedInstructors: prospect.estimated_instructors,
    programsNeeded: prospect.programs_needed,
    painPoints: prospect.pain_points,
    budgetRange: prospect.budget_range,
    source: prospect.source
  });

  const { error } = await admin
    .from("institution_prospects")
    .update({
      ai_score: analysis.score,
      ai_priority: analysis.priority,
      ai_summary: analysis.summary,
      ai_next_action: analysis.nextAction,
      ai_email_draft: analysis.emailDraft
    })
    .eq("id", parsed.data.prospectId);

  if (error) {
    redirect(`/platform/prospects?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/platform/prospects");
  redirect("/platform/prospects?updated=1");
}
