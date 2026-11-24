// Feedback (docs/IMPROVEMENT_PLAN.md 7.3): a pre-filled email the student sends from their own mail app. The site sends
// nothing and stores no address; the student writes their email into the message so we can reply. A browser-side limit
// keeps one person from opening it over and over (the site is static, so there is no server to limit at).
import { load, save } from "../state/storage.ts";

export const FEEDBACK_EMAIL = "chihuan.danielm@gmail.com";
export const LIMIT = { gapMinutes: 10, perDay: 3 } as const;
export const FEEDBACK_KEY = "cpm.feedback.v1";

const MIN = 60_000, DAY = 24 * 60 * MIN;

/** The mailto link: subject, a short template with a required reply-address line, and the versions (no answers). */
export function feedbackMailto(v: { dataVersion: string; engineVersion: string }): string {
  const body = [
    "What were you trying to do?",
    "",
    "",
    "What was wrong, missing, or confusing?",
    "",
    "",
    "Your email, so we can reply (required):",
    "",
    "",
    `(Built with dataset ${v.dataVersion}, engine ${v.engineVersion}.)`,
  ].join("\n");
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Career Pathway Mapper feedback")}&body=${encodeURIComponent(body)}`;
}

const recent = (sent: unknown[], now: number) => sent.filter((t): t is number => typeof t === "number" && t > now - DAY && t <= now);

/** When the next email may be opened (epoch ms), or null if it may be now: 10 minutes apart, 3 a day. */
export function nextAllowed(sent: number[], now: number): number | null {
  const r = recent(Array.isArray(sent) ? sent : [], now).sort((a, b) => a - b);
  const waits = [...(r.length ? [r.at(-1)! + LIMIT.gapMinutes * MIN] : []), ...(r.length >= LIMIT.perDay ? [r[r.length - LIMIT.perDay] + DAY] : [])];
  const at = Math.max(0, ...waits);
  return at > now ? at : null;
}

/** The send times to keep after one more at `now` (only the last day's). */
export const record = (sent: number[], now: number): number[] => [...recent(Array.isArray(sent) ? sent : [], now), now];

export const loadSent = (): number[] => load<number[]>(FEEDBACK_KEY) ?? [];
export const saveSent = (sent: number[]) => save(FEEDBACK_KEY, sent);
