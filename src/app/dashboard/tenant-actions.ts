"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function switchTenantAction(formData: FormData) {
  const { profile } = await requireProfile();
  const tenantId = String(formData.get("tenantId") ?? "");

  if (!tenantId) {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id,role,status")
    .eq("tenant_id", tenantId)
    .eq("user_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard?error=You do not have access to that organization.");
  }

  const { error } = await supabase.from("profiles").update({ default_tenant_id: tenantId }).eq("id", profile.id);

  if (error) {
    redirect("/dashboard?error=Tenant could not be changed.");
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
