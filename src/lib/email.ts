import { env } from "@/lib/env";

const DEFAULT_FROM = "Dosis Educa <notificaciones@kingdomtechgroup.org>";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

/**
 * Send a transactional email via the Resend HTTP API. Silently no-ops (returns false) when
 * RESEND_API_KEY isn't configured, so local/dev environments and environments that haven't set up
 * email yet don't crash — callers should treat email delivery as best-effort, not a hard
 * dependency of the action that triggers it.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = env("RESEND_API_KEY");

  if (!apiKey) {
    return false;
  }

  const recipients = Array.isArray(input.to) ? input.to : [input.to];

  if (recipients.length === 0) {
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: input.from ?? DEFAULT_FROM,
        to: recipients,
        subject: input.subject,
        html: input.html
      })
    });

    return response.ok;
  } catch {
    return false;
  }
}

/** Escape user-supplied text (names, feedback, titles) before interpolating into an email's HTML. */
export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Minimal shared email shell so every notification looks consistent without a template engine. */
export function renderEmail({ heading, body }: { heading: string; body: string }) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #2d2d2d;">
      <h1 style="font-size: 18px; margin: 0 0 16px;">${escapeHtml(heading)}</h1>
      <div style="font-size: 14px; line-height: 1.6;">${body}</div>
      <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Dosis Educa LMS</p>
    </div>
  `;
}
