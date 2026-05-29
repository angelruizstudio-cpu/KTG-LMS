"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { analyzeInstitutionProspect } from "@/lib/prospect-ai";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const prospectSchema = z.object({
  institutionName: z.string().min(2),
  institutionType: z.enum(["church", "bible_institute", "seminary", "school", "ministry", "nonprofit", "other"]),
  website: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  contactName: z.string().min(2),
  contactRole: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  estimatedStudents: z.number().int().min(0).nullable(),
  estimatedInstructors: z.number().int().min(0).nullable(),
  programsNeeded: z.string().optional(),
  painPoints: z.string().optional(),
  budgetRange: z.string().optional()
});

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function numberValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value ? Number(value) : null;
}

export async function requestDemoAction(formData: FormData) {
  const parsed = prospectSchema.safeParse({
    institutionName: textValue(formData, "institutionName"),
    institutionType: textValue(formData, "institutionType") ?? "other",
    website: textValue(formData, "website"),
    country: textValue(formData, "country"),
    city: textValue(formData, "city"),
    contactName: textValue(formData, "contactName"),
    contactRole: textValue(formData, "contactRole"),
    email: textValue(formData, "email"),
    phone: textValue(formData, "phone"),
    estimatedStudents: numberValue(formData, "estimatedStudents"),
    estimatedInstructors: numberValue(formData, "estimatedInstructors"),
    programsNeeded: textValue(formData, "programsNeeded"),
    painPoints: textValue(formData, "painPoints"),
    budgetRange: textValue(formData, "budgetRange")
  });

  if (!parsed.success) {
    redirect("/request-demo?error=Please complete the required fields.");
  }

  const analysis = await analyzeInstitutionProspect({
    institutionName: parsed.data.institutionName,
    institutionType: parsed.data.institutionType,
    country: parsed.data.country,
    city: parsed.data.city,
    contactName: parsed.data.contactName,
    contactRole: parsed.data.contactRole,
    email: parsed.data.email,
    phone: parsed.data.phone,
    estimatedStudents: parsed.data.estimatedStudents,
    estimatedInstructors: parsed.data.estimatedInstructors,
    programsNeeded: parsed.data.programsNeeded,
    painPoints: parsed.data.painPoints,
    budgetRange: parsed.data.budgetRange,
    source: "request_demo"
  });

  const admin = createSupabaseAdminClient();
  const { data: prospect, error } = await admin
    .from("institution_prospects")
    .insert({
      institution_name: parsed.data.institutionName,
      institution_type: parsed.data.institutionType,
      website: parsed.data.website,
      country: parsed.data.country,
      city: parsed.data.city,
      contact_name: parsed.data.contactName,
      contact_role: parsed.data.contactRole,
      email: parsed.data.email,
      phone: parsed.data.phone,
      estimated_students: parsed.data.estimatedStudents,
      estimated_instructors: parsed.data.estimatedInstructors,
      programs_needed: parsed.data.programsNeeded,
      pain_points: parsed.data.painPoints,
      budget_range: parsed.data.budgetRange,
      source: "request_demo",
      status: "new",
      ai_score: analysis.score,
      ai_priority: analysis.priority,
      ai_summary: analysis.summary,
      ai_next_action: analysis.nextAction,
      ai_email_draft: analysis.emailDraft
    })
    .select("id")
    .single();

  if (error || !prospect) {
    redirect(`/request-demo?error=${encodeURIComponent(error?.message ?? "Request could not be submitted.")}`);
  }

  await admin.from("institution_prospect_interactions").insert({
    prospect_id: prospect.id,
    interaction_type: "note",
    content: "Demo request submitted from the public website."
  });

  redirect("/request-demo?sent=1");
}
