import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

/**
 * Sanitize a user-facing banner message that arrived through a URL query param (e.g. ?error=).
 * Strips anything that looks like a link or contact handle so an attacker cannot craft a phishing
 * message (e.g. "Call this number: …") via a shared link, and caps the length.
 */
export function sanitizeBannerMessage(value: string | undefined | null, maxLength = 200) {
  if (!value) {
    return "";
  }

  return value
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, "")
    .replace(/[+]?\d[\d\s().-]{6,}\d/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate a post-auth `next` redirect target. Only same-site absolute paths are allowed;
 * protocol-relative ("//evil.com") and backslash tricks ("/\\evil.com") are rejected so `next`
 * cannot be used as an open redirect. Falls back to the given default.
 */
export function safeNextPath(value: string | undefined | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }

  // Reject control characters that could be used to break out of the path.
  if (/[\x00-\x1f\x7f]/.test(value)) {
    return fallback;
  }

  return value;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export const formatDueDate = formatDateTime;

/** Whether a due date has passed. Returns false for completed items or lessons with no due date. */
export function isOverdue(dueAt: string | null, completed: boolean) {
  return Boolean(dueAt) && !completed && new Date(dueAt as string).getTime() < Date.now();
}

/**
 * Maps a percentage score to a 4.0-scale grade point. There is no configurable institutional
 * grading scale in this product yet — this is a standard, fixed mapping used only to compute the
 * GPA shown on a student's record/transcript.
 */
export function gradePoint(percent: number) {
  if (percent >= 90) return 4.0;
  if (percent >= 80) return 3.0;
  if (percent >= 70) return 2.0;
  if (percent >= 60) return 1.0;
  return 0.0;
}

/** Weighted-average GPA from a list of {score, max_score} gradebook entries. Returns null if empty. */
export function calculateGpa(entries: Array<{ score: number; max_score: number }>): number | null {
  const validEntries = entries.filter((entry) => entry.max_score > 0);
  if (!validEntries.length) {
    return null;
  }

  const totalPoints = validEntries.reduce((sum, entry) => sum + gradePoint((entry.score / entry.max_score) * 100), 0);
  return totalPoints / validEntries.length;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
