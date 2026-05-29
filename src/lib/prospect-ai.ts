import { env } from "@/lib/env";

export type ProspectAnalysisInput = {
  institutionName: string;
  institutionType: string;
  country?: string | null;
  city?: string | null;
  contactName: string;
  contactRole?: string | null;
  email: string;
  phone?: string | null;
  estimatedStudents?: number | null;
  estimatedInstructors?: number | null;
  programsNeeded?: string | null;
  painPoints?: string | null;
  budgetRange?: string | null;
  source?: string | null;
};

export type ProspectAnalysis = {
  score: number;
  priority: "low" | "medium" | "high";
  summary: string;
  nextAction: string;
  emailDraft: string;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function priorityFromScore(score: number): ProspectAnalysis["priority"] {
  if (score >= 75) {
    return "high";
  }

  if (score >= 45) {
    return "medium";
  }

  return "low";
}

function normalizeAnalysis(value: Partial<ProspectAnalysis>, fallback: ProspectAnalysis): ProspectAnalysis {
  const score = clampScore(Number(value.score ?? fallback.score));
  return {
    score,
    priority: value.priority === "high" || value.priority === "medium" || value.priority === "low" ? value.priority : priorityFromScore(score),
    summary: value.summary?.trim() || fallback.summary,
    nextAction: value.nextAction?.trim() || fallback.nextAction,
    emailDraft: value.emailDraft?.trim() || fallback.emailDraft
  };
}

function heuristicAnalysis(input: ProspectAnalysisInput): ProspectAnalysis {
  let score = 25;
  const studentCount = input.estimatedStudents ?? 0;
  const programs = input.programsNeeded?.toLowerCase() ?? "";
  const painPoints = input.painPoints?.toLowerCase() ?? "";

  if (["seminary", "bible_institute", "school"].includes(input.institutionType)) {
    score += 15;
  }

  if (studentCount >= 250) {
    score += 25;
  } else if (studentCount >= 100) {
    score += 18;
  } else if (studentCount >= 40) {
    score += 10;
  }

  if (input.estimatedInstructors && input.estimatedInstructors >= 3) {
    score += 8;
  }

  if (programs.length > 20) {
    score += 12;
  }

  if (painPoints.includes("certificate") || painPoints.includes("certificado")) {
    score += 8;
  }

  if (painPoints.includes("program") || painPoints.includes("canvas") || painPoints.includes("manual")) {
    score += 8;
  }

  if (input.phone) {
    score += 5;
  }

  if (input.budgetRange) {
    score += 7;
  }

  const finalScore = clampScore(score);
  const priority = priorityFromScore(finalScore);
  const institution = input.institutionName;
  const programSummary = input.programsNeeded ? ` Needs mentioned: ${input.programsNeeded}` : "";

  return {
    score: finalScore,
    priority,
    summary: `${institution} looks like a ${priority}-priority LMS prospect based on institution type, expected student volume, and stated needs.${programSummary}`,
    nextAction:
      priority === "high"
        ? "Schedule a discovery call and prepare a program-based LMS demo with certificates, finance clearance, and admin controls."
        : "Send a short qualification email asking about programs, student count, timeline, and decision process.",
    emailDraft: `Hello ${input.contactName},\n\nThank you for your interest in Dosis Educa LMS. I would love to learn more about ${institution} and the programs you want to manage online.\n\nA good next step would be a short call where we can review your student access process, certificates, instructor tools, and reporting needs.\n\nBlessings,\nDosis Educa Team`
  };
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  if (record.output_text) {
    return record.output_text;
  }

  return (
    record.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

export async function analyzeInstitutionProspect(input: ProspectAnalysisInput): Promise<ProspectAnalysis> {
  const fallback = heuristicAnalysis(input);
  const apiKey = env("OPENAI_API_KEY");
  const model = env("OPENAI_MODEL");

  if (!apiKey || !model) {
    return fallback;
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
              "You qualify institutions interested in subscribing to a multi-tenant LMS. Return only JSON with score, priority, summary, nextAction, and emailDraft. Score is 0-100. Priority is low, medium, or high. Keep the tone professional and warm."
          },
          {
            role: "user",
            content: JSON.stringify(input)
          }
        ]
      })
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const text = extractResponseText(payload);
    const parsed = JSON.parse(text) as Partial<ProspectAnalysis>;
    return normalizeAnalysis(parsed, fallback);
  } catch {
    return fallback;
  }
}
