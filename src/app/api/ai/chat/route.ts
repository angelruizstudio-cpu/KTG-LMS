import { createHmac, timingSafeEqual } from "crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { buildAiChatFallbackReply, generateAiChatReply, type AiChatMessage } from "@/lib/ai-chat";
import { loadActiveAiKnowledge } from "@/lib/ai-knowledge";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(1200),
  sourcePage: z.string().trim().max(120).optional()
});

// Best-effort in-memory rate limit. Serverless instances each keep their own window, so this is a
// coarse abuse throttle, not a hard guarantee — pair with an edge/CDN limit in production.
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) ?? []).filter((ts) => now - ts < RATE_WINDOW_MS);
  hits.push(now);
  rateBuckets.set(ip, hits);
  return hits.length > RATE_LIMIT;
}

const CONVERSATION_COOKIE = "aichat_cid";

function signConversationId(conversationId: string) {
  // Reuse the server-only service role key as an HMAC secret so the signature cannot be forged
  // by a client. Never exposed to the browser.
  const secret = env("SUPABASE_SERVICE_ROLE_KEY") || "local-dev-secret";
  return createHmac("sha256", secret).update(conversationId).digest("hex");
}

function conversationCookieValue(conversationId: string) {
  return `${conversationId}.${signConversationId(conversationId)}`;
}

function verifyOwnedConversation(conversationId: string, cookieValue: string | undefined) {
  if (!cookieValue) {
    return false;
  }

  const separator = cookieValue.lastIndexOf(".");
  if (separator < 0) {
    return false;
  }

  const cookieId = cookieValue.slice(0, separator);
  const cookieSig = cookieValue.slice(separator + 1);
  if (cookieId !== conversationId) {
    return false;
  }

  const expected = signConversationId(conversationId);
  const a = Buffer.from(cookieSig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const parsed = chatSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }

  const cookieStore = await cookies();

  // Only trust a supplied conversationId if it was issued to THIS browser (signed cookie).
  // Otherwise ignore it and start fresh, so an attacker cannot inject into or read another
  // visitor's conversation by guessing/replaying a UUID (see security finding H3).
  let conversationId =
    parsed.data.conversationId &&
    verifyOwnedConversation(parsed.data.conversationId, cookieStore.get(CONVERSATION_COOKIE)?.value)
      ? parsed.data.conversationId
      : undefined;

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
      // Bind the new conversation to this browser so future turns can be verified as owned.
      cookieStore.set(CONVERSATION_COOKIE, conversationCookieValue(conversationId), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24
      });
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
    if (!conversationId || !admin) {
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
    if (!admin) {
      return [];
    }

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
