"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const notificationIdSchema = z.object({ notificationId: z.string().uuid() });

export async function markNotificationReadAction(formData: FormData) {
  const { profile } = await requireProfile();
  const parsed = notificationIdSchema.safeParse({ notificationId: formData.get("notificationId") });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data.notificationId)
    .eq("recipient_id", profile.id);

  revalidatePath("/dashboard/notifications");
}

export async function markAllNotificationsReadAction() {
  const { profile } = await requireProfile();
  const supabase = await createSupabaseServerClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", profile.id).is("read_at", null);

  revalidatePath("/dashboard/notifications");
}
