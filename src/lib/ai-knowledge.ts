import type { SupabaseClient } from "@supabase/supabase-js";

export type AiKnowledgeSource = {
  title: string;
  category: string;
  content: string;
};

export async function loadActiveAiKnowledge(supabase: SupabaseClient, limit = 12): Promise<AiKnowledgeSource[]> {
  const { data } = await supabase
    .from("ai_knowledge_sources")
    .select("title,category,content")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export function formatAiKnowledge(sources: AiKnowledgeSource[]) {
  if (!sources.length) {
    return "No platform knowledge sources are configured yet.";
  }

  return sources
    .map((source, index) => {
      return `${index + 1}. [${source.category}] ${source.title}\n${source.content}`;
    })
    .join("\n\n");
}
