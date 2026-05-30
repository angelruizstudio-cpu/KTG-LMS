import { formatAiKnowledge, type AiKnowledgeSource } from "@/lib/ai-knowledge";
import { env } from "@/lib/env";

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function buildAiChatFallbackReply(message?: string) {
  const lowerMessage = message?.toLowerCase() ?? "";

  if (lowerMessage.includes("instituto") || lowerMessage.includes("iglesia") || lowerMessage.includes("seminar")) {
    return (
      "Claro. Dosis Educa es un LMS para instituciones que quieren administrar programas, cursos asignados, estudiantes, instructores, progreso, calificaciones y certificados. " +
      "Para orientarte mejor, dime cuántos estudiantes tiene tu institución, qué programas deseas ofrecer y si necesitas certificados al completar el programa."
    );
  }

  return (
    "Gracias por escribirnos. Puedo ayudarte con preguntas sobre Dosis Educa LMS, programas, acceso institucional, certificados, instructores y demos. " +
    "Para darte una respuesta personalizada, dime el nombre de tu institución, cantidad aproximada de estudiantes y qué programas deseas ofrecer."
  );
}

export async function generateAiChatReply({
  messages,
  knowledgeSources
}: {
  messages: AiChatMessage[];
  knowledgeSources: AiKnowledgeSource[];
}) {
  const apiKey = env("OPENAI_API_KEY");
  const model = env("OPENAI_MODEL", "gpt-5.2");
  const latestMessage = messages.at(-1)?.content ?? "";

  if (!apiKey) {
    return buildAiChatFallbackReply(latestMessage);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "You are the public Dosis Educa LMS assistant for institutions interested in subscribing. Answer in the user's language when possible. Keep answers helpful, concise, warm, and professional. Your job is to explain the LMS, answer institution questions, qualify needs, and guide interested institutions to request a demo. Do not claim pricing unless it appears in the knowledge base. Do not provide legal, financial, medical, or unrelated advice. If asked by students to access courses, explain that students must use their institution-issued ID and institution login. Ask for institution name, program needs, student count, and timeline when appropriate.\n\nPlatform knowledge:\n" +
              formatAiKnowledge(knowledgeSources)
          },
          ...messages.slice(-8).map((message) => ({
            role: message.role,
            content: message.content
          })),
          {
            role: "user",
            content: latestMessage
          }
        ]
      })
    });

    if (!response.ok) {
      return buildAiChatFallbackReply(latestMessage);
    }

    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };

    return (
      payload.output_text ??
      payload.output
        ?.flatMap((item) => item.content ?? [])
        .map((content) => content.text)
        .filter(Boolean)
        .join("\n") ??
      buildAiChatFallbackReply(latestMessage)
    );
  } catch {
    return buildAiChatFallbackReply(latestMessage);
  }
}
