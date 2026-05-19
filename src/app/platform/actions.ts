"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePlatformAdmin } from "@/lib/platform-auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const platformLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const institutionSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  code: z.string().min(2).max(8),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8)
});

const tenantStatusSchema = z.object({
  tenantId: z.string().uuid(),
  status: z.enum(["active", "suspended"])
});

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function toTenantCode(value: string) {
  return value
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);
}

export async function platformLoginAction(formData: FormData) {
  const parsed = platformLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirect("/platform/login?error=Check your platform admin credentials.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error) {
    redirect("/platform/login?error=Check your platform admin credentials.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: platformAdmin } = user
    ? await supabase.from("platform_admins").select("status").eq("user_id", user.id).eq("status", "active").maybeSingle()
    : { data: null };

  if (!platformAdmin) {
    await supabase.auth.signOut();
    redirect("/platform/login?error=Platform administrator access is required.");
  }

  redirect("/platform");
}

export async function createInstitutionAction(formData: FormData) {
  await requirePlatformAdmin();

  const parsed = institutionSchema.safeParse({
    name: formData.get("name"),
    slug: toSlug(String(formData.get("slug") ?? formData.get("name") ?? "")),
    code: toTenantCode(String(formData.get("code") ?? "")),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword")
  });

  if (!parsed.success) {
    redirect("/platform?error=Institution and admin details are required.");
  }

  const admin = createSupabaseAdminClient();
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      code: parsed.data.code,
      status: "active"
    })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    redirect(`/platform?error=${encodeURIComponent(tenantError?.message ?? "Institution could not be created.")}`);
  }

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: parsed.data.adminEmail,
    password: parsed.data.adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.adminName,
      role: "admin",
      tenant_id: tenant.id
    }
  });

  if (userError || !userData.user) {
    redirect(`/platform?error=${encodeURIComponent(userError?.message ?? "Institution admin could not be created.")}`);
  }

  await admin.from("profiles").upsert({
    id: userData.user.id,
    email: parsed.data.adminEmail,
    full_name: parsed.data.adminName,
    role: "admin",
    default_tenant_id: tenant.id
  });

  await admin.from("tenant_memberships").upsert(
    {
      tenant_id: tenant.id,
      user_id: userData.user.id,
      role: "admin",
      status: "active"
    },
    { onConflict: "tenant_id,user_id" }
  );

  const { data: institutionUserId } = await admin.rpc("next_institution_user_id", { tenant_uuid: tenant.id });
  await admin.from("tenant_user_identities").upsert(
    {
      tenant_id: tenant.id,
      user_id: userData.user.id,
      institution_user_id: institutionUserId ?? `${parsed.data.code}-000001`,
      role: "admin",
      status: "active"
    },
    { onConflict: "tenant_id,user_id" }
  );

  revalidatePath("/platform");
  redirect("/platform?created=institution");
}

export async function updateInstitutionStatusAction(formData: FormData) {
  await requirePlatformAdmin();

  const parsed = tenantStatusSchema.safeParse({
    tenantId: formData.get("tenantId"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    redirect("/platform?error=Institution status update is invalid.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("tenants").update({ status: parsed.data.status }).eq("id", parsed.data.tenantId);

  if (error) {
    redirect(`/platform?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/platform");
}
