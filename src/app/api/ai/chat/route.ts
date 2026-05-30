import { NextResponse } from "next/server";
import { z } from "zod";

import { buildAiChatFallbackReply, generateAiChatReply, type AiChatMessage } from "@/lib/ai-chat";
import { loadActiveAiKnowledge } from "@/lib/ai-knowledge";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(1200),
  sourcePage: z.string().trim().max(120).optional()
});

export async function POST(request: Request) {
  const parsed = chatSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }

  let conversationId = parsed.data.conversationId;
  let admin: ReturnType<typeof createSupabaseAdminClient> | null = null;

  try {
    admin = createSupabaseAdminClient();
  } catch {
    const reply = buildAiChatFallbackReply(parsed.data.message);
    return NextResponse.json({ conversationId, reply, persisted: false });
  }

  if (!conversationId) {
    let conversation: { id: string } | null = null;
    let error: unknown = null;

    try {
      const result = await admin
        .from("ai_chat_conversations")
        .insert({
          source_page: parsed.data.sourcePage ?? "public_site",
          status: "open"
        })
        .select("id")
        .single();
      conversation = result.data;
      error = result.error;
    } catch (caughtError) {
      error = caughtError;
    }

    if (!error && conversation) {
      conversationId = conversation.id;
    }
  }

  if (conversationId) {
    try {
      await admin.from("ai_chat_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: parsed.data.message
      });
    } catch {
      // Chat should still respond if persistence is unavailable.
    }
  }

  const previousMessagesPromise = async () => {
    if (!conversationId) {
      return { data: null };
    }

    try {
      const result = await admin
        .from("ai_chat_messages")
        .select("role,content,created_at")
        .eq("conversation_id", conversationId)
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: false })
        .limit(8);

      return { data: result.data ?? null };
    } catch {
      return { data: null };
    }
  };

  const knowledgeSourcesPromise = async () => {
    try {
      return await loadActiveAiKnowledge(admin, 16);
    } catch {
      return [];
    }
  };

  const [previousMessagesResult, knowledgeSources] = await Promise.all([previousMessagesPromise(), knowledgeSourcesPromise()]);

  const messages = ((previousMessagesResult.data ?? []).reverse() as AiChatMessage[]).filter(
    (message) => message.role === "user" || message.role === "assistant"
  );
  const reply = await generateAiChatReply({
    messages: messages.length ? messages : [{ role: "user", content: parsed.data.message }],
    knowledgeSources
  });

  if (conversationId) {
    try {
      await admin.from("ai_chat_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: reply
      });
    } catch {
      // Chat should still respond if persistence is unavailable.
    }

    try {
      await admin.from("ai_chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    } catch {
      // Chat should still respond if persistence is unavailable.
    }
  }

  return NextResponse.json({ conversationId, reply, persisted: Boolean(conversationId) });
}
