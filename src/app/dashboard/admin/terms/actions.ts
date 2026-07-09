"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const termSchema = z
  .object({
    name: z.string().min(2),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"]
  });

export async function createAcademicTermAction(formData: FormData) {
  const { profile } = await requireProfile(["admin"]);
  const parsed = termSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined
  });

  if (!parsed.success) {
    redirect(`/dashboard/admin/terms?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Term details are invalid.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("academic_terms").insert({
    tenant_id: profile.default_tenant_id,
    name: parsed.data.name,
    start_date: parsed.data.startDate || null,
    end_date: parsed.data.endDate || null
  });

  if (error) {
    redirect(`/dashboard/admin/terms?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/admin/terms");
  redirect(`/dashboard/admin/terms?created=${encodeURIComponent(parsed.data.name)}`);
}
