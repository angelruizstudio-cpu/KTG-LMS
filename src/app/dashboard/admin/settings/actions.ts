"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export async function addTenantMemberAction(formData: FormData) {
  const { profile } = await requireProfile(["admin"]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "student") as UserRole;
  const allowedRoles: UserRole[] = ["admin", "instructor", "student"];

  if (!email || !allowedRoles.includes(role)) {
    redirect("/dashboard/admin/settings?error=Valid email and role are required.");
  }

  const admin = createSupabaseAdminClient();
  const { data: targetProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();

  if (!targetProfile) {
    redirect("/dashboard/admin/settings?error=That user must register before being added to this organization.");
  }

  const { error } = await admin.from("tenant_memberships").upsert(
    {
      tenant_id: profile.default_tenant_id,
      user_id: targetProfile.id,
      role,
      status: "active"
    },
    { onConflict: "tenant_id,user_id" }
  );

  if (error) {
    redirect("/dashboard/admin/settings?error=User could not be added to this organization.");
  }

  const { data: existingIdentity } = await admin
    .from("tenant_user_identities")
    .select("id")
    .eq("tenant_id", profile.default_tenant_id)
    .eq("user_id", targetProfile.id)
    .maybeSingle();

  if (!existingIdentity) {
    const { data: institutionUserId } = await admin.rpc("next_institution_user_id", { tenant_uuid: profile.default_tenant_id });
    await admin.from("tenant_user_identities").insert({
      tenant_id: profile.default_tenant_id,
      user_id: targetProfile.id,
      institution_user_id: institutionUserId ?? `USER-${targetProfile.id.slice(0, 6).toUpperCase()}`,
      role,
      status: "active"
    });
  } else {
    await admin
      .from("tenant_user_identities")
      .update({ role, status: "active" })
      .eq("tenant_id", profile.default_tenant_id)
      .eq("user_id", targetProfile.id);
  }

  revalidatePath("/dashboard/admin/settings");
  redirect("/dashboard/admin/settings?created=member");
}
