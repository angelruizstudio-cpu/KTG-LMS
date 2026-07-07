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

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
