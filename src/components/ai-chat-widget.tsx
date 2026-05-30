"use client";

import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export function AiChatWidget({ sourcePage = "public_site" }: { sourcePage?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hola, soy el asistente de Dosis Educa. Puedo ayudarte a entender el LMS, programas, certificados, acceso institucional y demos. ¿Qué tipo de institución representas?"
    }
  ]);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function sendMessage() {
    const message = input.trim();

    if (!message || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          conversationId,
          message,
          sourcePage
        })
      });

      const payload = (await response.json()) as { conversationId?: string; reply?: string; error?: string };

      if (!response.ok || !payload.reply) {
        throw new Error(payload.error ?? "Chat failed.");
      }

      const assistantReply = payload.reply;

      if (payload.conversationId) {
        setConversationId(payload.conversationId);
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantReply
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Puedo ayudarte con Dosis Educa LMS, programas, certificados y demos. Dime el nombre de tu institución, cuántos estudiantes tienen y qué programas deseas ofrecer."
        }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <section className="mb-4 flex h-[560px] w-[min(calc(100vw-2.5rem),390px)] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
          <header className="flex items-center justify-between bg-sidebar px-5 py-4 text-text-inverse">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary p-2 shadow-glow">
                <Bot size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold">Dosis Educa AI</h2>
                <p className="text-xs text-text-inverse/70">Institution assistant</p>
              </div>
            </div>
            <button
              aria-label="Close AI chat"
              className="rounded-full p-2 text-text-inverse/75 hover:bg-sidebar-hover hover:text-text-inverse"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-background p-4">
            {messages.map((message) => (
              <div
                className={cn(
                  "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                  message.role === "assistant"
                    ? "mr-auto border border-border bg-surface text-text-primary"
                    : "ml-auto bg-primary text-text-inverse"
                )}
                key={message.id}
              >
                {message.content}
              </div>
            ))}
            {isSending ? (
              <div className="mr-auto flex w-fit items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary shadow-sm">
                <Loader2 className="animate-spin" size={16} />
                Thinking...
              </div>
            ) : null}
          </div>

          <form
            className="border-t border-border bg-surface p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-background p-2 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-light">
              <input
                aria-label="Message Dosis Educa AI"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-text-primary outline-none placeholder:text-text-secondary/60"
                maxLength={1200}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about the LMS..."
                value={input}
              />
              <button
                aria-label="Send message"
                className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-text-inverse shadow-glow transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSend}
                type="submit"
              >
                <Send size={17} />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        aria-label="Open Dosis Educa AI chat"
        className="inline-flex h-14 items-center gap-3 rounded-full bg-primary px-5 font-bold text-text-inverse shadow-glow transition hover:bg-primary-hover"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <MessageCircle size={22} />
        AI Assistant
      </button>
    </div>
  );
}
