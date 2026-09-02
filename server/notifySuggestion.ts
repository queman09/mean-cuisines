/**
 * Email ping when a suggestion is queued.
 * Set RESEND_API_KEY (+ optional SUGGESTION_NOTIFY_EMAIL, SUGGESTION_FROM_EMAIL) on Railway.
 * Do not commit API keys.
 */
export type SuggestionNotifyPayload = {
  id: number;
  suggestion: string;
  why: string | null;
  contact: string | null;
  source: string;
  agentName: string | null;
  status: string;
};

const RESEND_URL = "https://api.resend.com/emails";
const EMAIL_TIMEOUT_MS = 2000;

export async function notifySuggestionQueued(row: SuggestionNotifyPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[notifySuggestion] RESEND_API_KEY is not set — skipping email ping. Set it on Railway to notify the operator.",
    );
    return;
  }

  const to = process.env.SUGGESTION_NOTIFY_EMAIL || "hello@meancuisines.com";
  const from =
    process.env.SUGGESTION_FROM_EMAIL || "Mean Cuisines <onboarding@resend.dev>";
  const subject = `[Mean Cuisines] New ${row.source} suggestion #${row.id}`;
  const text = [
    `A new suggestion was queued and needs approval.`,
    ``,
    `id: ${row.id}`,
    `status: ${row.status}`,
    `source: ${row.source}`,
    `agentName: ${row.agentName ?? "(none)"}`,
    `contact: ${row.contact ?? "(none)"}`,
    ``,
    `suggestion:`,
    row.suggestion,
    ``,
    `why:`,
    row.why?.trim() ? row.why : "(none)",
    ``,
    `Review / queue: https://meancuisines.com/suggest`,
    `Approval is required before anything changes on the live site.`,
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[notifySuggestion] Resend HTTP ${res.status} for suggestion #${row.id}: ${body.slice(0, 500)}`,
      );
    }
  } catch (err) {
    console.error(`[notifySuggestion] Failed to email for suggestion #${row.id}:`, err);
  } finally {
    clearTimeout(timer);
  }
}

/** Fire-and-forget wrapper — never throws to the caller. */
export function notifySuggestionQueuedFireAndForget(row: SuggestionNotifyPayload): void {
  void notifySuggestionQueued(row).catch((err) => {
    console.error(`[notifySuggestion] Unexpected error for #${row.id}:`, err);
  });
}