import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export async function getSessionProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    return { user, profile: null };
  }

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role,status")
    .eq("user_id", user.id)
    .eq("tenant_id", profile.default_tenant_id)
    .eq("status", "active")
    .maybeSingle();

  return {
    user,
    profile: {
      ...profile,
      role: membership?.role ?? profile.role
    }
  };
}

export async function requireProfile(allowedRoles?: UserRole[]) {
  const { user, profile } = await getSessionProfile();

  if (!user || !profile) {
    redirect("/auth/login");
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  return { user, profile };
}
