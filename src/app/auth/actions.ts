"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseAdminClient, createSupabaseServerClient, tryCreateSupabaseAdminClient } from "@/lib/supabase/server";

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

const passwordResetRequestSchema = z.discriminatedUnion("accountType", [
  z.object({
    accountType: z.literal("institution"),
    institutionUserId: z.string().min(3)
  }),
  z.object({
    accountType: z.literal("platform"),
    email: z.string().email()
  })
]);

const updatePasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
}

function forgotPasswordPath(accountType: "institution" | "platform", params: Record<string, string | number> = {}) {
  const query = new URLSearchParams({ accountType, ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])) });
  return `/auth/forgot-password?${query.toString()}`;
}

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
      emailRedirectTo: `${siteUrl()}/auth/callback`
    }
  });

  if (error) {
    redirect(`/auth/register?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function requestPasswordResetAction(formData: FormData) {
  const accountType = String(formData.get("accountType"));
  const accountTypeForRedirect = accountType === "platform" ? "platform" : "institution";
  const parsed = passwordResetRequestSchema.safeParse(
    accountType === "platform"
      ? {
          accountType,
          email: formData.get("email")
        }
      : {
          accountType: "institution",
          institutionUserId: formData.get("institutionUserId")
        }
  );

  if (!parsed.success) {
    redirect(forgotPasswordPath(accountTypeForRedirect, { error: "Enter a valid institution ID or platform email." }));
  }

  let email: string | null = null;
  const admin = tryCreateSupabaseAdminClient();

  if (!admin) {
    redirect(
      forgotPasswordPath(parsed.data.accountType, {
        error: "Password reset is temporarily unavailable. Contact support."
      })
    );
  }

  try {
    if (parsed.data.accountType === "institution") {
      const institutionUserId = parsed.data.institutionUserId.trim().toUpperCase();
      const { data: identity } = await admin
        .from("tenant_user_identities")
        .select("user_id,status")
        .eq("institution_user_id", institutionUserId)
        .eq("status", "active")
        .maybeSingle();

      if (identity) {
        const { data: profile } = await admin.from("profiles").select("email").eq("id", identity.user_id).maybeSingle();
        email = profile?.email ?? null;
      }
    } else {
      const { data: profile } = await admin.from("profiles").select("id,email").eq("email", parsed.data.email.toLowerCase()).maybeSingle();
      if (profile) {
        const { data: platformAdmin } = await admin
          .from("platform_admins")
          .select("status")
          .eq("user_id", profile.id)
          .eq("status", "active")
          .maybeSingle();
        email = platformAdmin ? profile.email : null;
      }
    }
  } catch (error) {
    console.error("Password reset lookup failed", error);
    redirect(
      forgotPasswordPath(parsed.data.accountType, {
        error: "Password reset is temporarily unavailable. Contact support."
      })
    );
  }

  if (email) {
    const supabase = await createSupabaseServerClient();
    let resetEmailFailed = false;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl()}/auth/callback?next=/auth/reset-password`
      });

      if (error) {
        console.error("Password reset email failed", error);
        resetEmailFailed = true;
      }
    } catch (error) {
      console.error("Password reset email failed", error);
      resetEmailFailed = true;
    }

    if (resetEmailFailed) {
      redirect(
        forgotPasswordPath(parsed.data.accountType, {
          error: "Password reset email could not be sent. Check Supabase Auth email settings."
        })
      );
    }
  }

  redirect(forgotPasswordPath(parsed.data.accountType, { sent: 1 }));
}

export async function updatePasswordAction(formData: FormData) {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    redirect("/auth/reset-password?error=Use matching passwords with at least 8 characters.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password
  });

  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/auth/login?message=Password updated. Please log in with your new password.");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
