"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  institutionUserId: z.string().min(3),
  password: z.string().min(6),
  next: z.string().optional()
});

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    institutionUserId: formData.get("institutionUserId"),
    password: formData.get("password"),
    next: formData.get("next") || "/dashboard"
  });

  if (!parsed.success) {
    redirect("/auth/login?error=Check your institution ID and password.");
  }

  const institutionUserId = parsed.data.institutionUserId.trim().toUpperCase();
  const admin = createSupabaseAdminClient();
  const { data: identity } = await admin
    .from("tenant_user_identities")
    .select("tenant_id,user_id,status")
    .eq("institution_user_id", institutionUserId)
    .eq("status", "active")
    .maybeSingle();

  if (!identity) {
    redirect("/auth/login?error=Institution ID was not found.");
  }

  const { data: profile } = await admin.from("profiles").select("email").eq("id", identity.user_id).single();

  if (!profile?.email) {
    redirect("/auth/login?error=Institution account is incomplete.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.password
  });

  if (error) {
    redirect("/auth/login?error=Check your institution ID and password.");
  }

  await supabase.from("profiles").update({ default_tenant_id: identity.tenant_id }).eq("id", identity.user_id);

  redirect(parsed.data.next ?? "/dashboard");
}

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirect("/auth/register?error=Use a valid name, email, and password.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        role: "student"
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`
    }
  });

  if (error) {
    redirect(`/auth/register?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
