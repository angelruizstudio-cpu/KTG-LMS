import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/platform/login");
  }

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!platformAdmin) {
    redirect("/platform/login?error=Platform administrator access is required.");
  }

  return { user };
}
