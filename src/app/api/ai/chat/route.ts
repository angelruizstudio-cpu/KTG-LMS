import { NextResponse } from "next/server";
import { z } from "zod";

import { generateAiChatReply, type AiChatMessage } from "@/lib/ai-chat";
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

  const admin = createSupabaseAdminClient();
  let conversationId = parsed.data.conversationId;

  if (!conversationId) {
    const { data: conversation, error } = await admin
      .from("ai_chat_conversations")
      .insert({
        source_page: parsed.data.sourcePage ?? "public_site",
        status: "open"
      })
      .select("id")
      .single();

    if (!error && conversation) {
      conversationId = conversation.id;
    }
  }

  if (conversationId) {
    await admin.from("ai_chat_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: parsed.data.message
    });
  }

  const [previousMessagesResult, knowledgeSources] = await Promise.all([
    conversationId
      ? admin
          .from("ai_chat_messages")
          .select("role,content,created_at")
          .eq("conversation_id", conversationId)
          .in("role", ["user", "assistant"])
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: null }),
    loadActiveAiKnowledge(admin, 16)
  ]);

  const messages = ((previousMessagesResult.data ?? []).reverse() as AiChatMessage[]).filter(
    (message) => message.role === "user" || message.role === "assistant"
  );
  const reply = await generateAiChatReply({
    messages: messages.length ? messages : [{ role: "user", content: parsed.data.message }],
    knowledgeSources
  });

  if (conversationId) {
    await admin.from("ai_chat_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply
    });

    await admin.from("ai_chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  }

  return NextResponse.json({ conversationId, reply });
}
