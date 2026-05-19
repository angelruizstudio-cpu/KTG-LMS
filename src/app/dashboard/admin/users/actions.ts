"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const userSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "instructor", "student"])
});

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "instructor", "student"])
});

export async function createInstructorAction(formData: FormData) {
  const { profile } = await requireProfile(["admin"]);
  const parsed = userSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") ?? "student"
  });

  if (!parsed.success) {
    redirect("/dashboard/admin/users?error=User details are invalid.");
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      tenant_id: profile.default_tenant_id
    }
  });

  if (error || !data.user) {
    redirect(`/dashboard/admin/users?error=${encodeURIComponent(error?.message ?? "Unable to create user.")}`);
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    role: parsed.data.role,
    default_tenant_id: profile.default_tenant_id
  });

  if (profileError) {
    redirect(`/dashboard/admin/users?error=${encodeURIComponent(profileError.message)}`);
  }

  const { error: membershipError } = await admin.from("tenant_memberships").upsert(
    {
      tenant_id: profile.default_tenant_id,
      user_id: data.user.id,
      role: parsed.data.role,
      status: "active"
    },
    { onConflict: "tenant_id,user_id" }
  );

  if (membershipError) {
    redirect(`/dashboard/admin/users?error=${encodeURIComponent(membershipError.message)}`);
  }

  const { data: institutionUserId } = await admin.rpc("next_institution_user_id", { tenant_uuid: profile.default_tenant_id });
  const issuedInstitutionUserId = institutionUserId ?? `USER-${data.user.id.slice(0, 6).toUpperCase()}`;
  const { error: identityError } = await admin.from("tenant_user_identities").upsert(
    {
      tenant_id: profile.default_tenant_id,
      user_id: data.user.id,
      institution_user_id: issuedInstitutionUserId,
      role: parsed.data.role,
      status: "active"
    },
    { onConflict: "tenant_id,user_id" }
  );

  if (identityError) {
    redirect(`/dashboard/admin/users?error=${encodeURIComponent(identityError.message)}`);
  }

  revalidatePath("/dashboard/admin/users");
  redirect(`/dashboard/admin/users?created=${encodeURIComponent(issuedInstitutionUserId)}`);
}

export async function updateUserRoleAction(formData: FormData) {
  const { profile } = await requireProfile(["admin"]);
  const parsed = roleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    redirect("/dashboard/admin/users?error=Role update is invalid.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role as UserRole })
    .eq("id", parsed.data.userId);

  if (error) {
    redirect(`/dashboard/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  await supabase
    .from("tenant_memberships")
    .update({ role: parsed.data.role as UserRole })
    .eq("tenant_id", profile.default_tenant_id)
    .eq("user_id", parsed.data.userId);

  await supabase
    .from("tenant_user_identities")
    .update({ role: parsed.data.role as UserRole })
    .eq("tenant_id", profile.default_tenant_id)
    .eq("user_id", parsed.data.userId);

  revalidatePath("/dashboard/admin/users");
}
