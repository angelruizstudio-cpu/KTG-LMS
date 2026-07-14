import type { SupabaseClient } from "@supabase/supabase-js";

/** In-app counterpart to the existing email notifications — same trigger points, no email dependency. */
export async function createNotification(
  supabase: SupabaseClient,
  params: { tenantId: string; recipientId: string; type: string; title: string; body?: string | null; link?: string | null }
) {
  await supabase.from("notifications").insert({
    tenant_id: params.tenantId,
    recipient_id: params.recipientId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null
  });
}

export async function createNotificationsForRecipients(
  supabase: SupabaseClient,
  params: { tenantId: string; recipientIds: string[]; type: string; title: string; body?: string | null; link?: string | null }
) {
  if (!params.recipientIds.length) {
    return;
  }

  await supabase.from("notifications").insert(
    params.recipientIds.map((recipientId) => ({
      tenant_id: params.tenantId,
      recipient_id: recipientId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null
    }))
  );
}
