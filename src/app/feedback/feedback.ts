// Feedback (docs/IMPROVEMENT_PLAN.md 7.3): a plain HTML form posted to Formspree, the same way as the owner's portfolio
// site. No Formspree script is loaded; the browser submits the form itself (CSP form-action allows only formspree.io).
// The student must give their email so we can reply. Formspree filters spam (plus the _gotcha honeypot); on top of that,
// a browser-side limit keeps one person from sending over and over (the site is static, so there is no server of ours).
import { load, save } from "../state/storage.ts";

/** The Formspree endpoint. To keep this site's messages apart from the portfolio's, make a new form and swap the id. */
export const FEEDBACK_ACTION = "https://formspree.io/f/mvkkzejk";
export const FEEDBACK_SUBJECT = "Career Pathway Mapper feedback";
export const LIMIT = { gapMinutes: 10, perDay: 3 } as const;
export const FEEDBACK_KEY = "cpm.feedback.v1";
export const EMAIL_PATTERN = "[^@\\s]+@[^@\\s]+\\.[^@\\s]+";
export const DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "icloud.com"] as const;
/** Ready-made openings: tapping one writes it into the message box and selects the blank. */
export const STARTERS = [
  { text: "Something in my plan doesn't fit me: [what and why]", select: "[what and why]" },
  { text: "A link is broken or out of date: [which one]", select: "[which one]" },
  { text: "I couldn't find [what you looked for]", select: "[what you looked for]" },
] as const;

const MIN = 60_000, DAY = 24 * 60 * MIN;

/** Keep what they typed before the @, swap the ending. */
export const withDomain = (email: string, domain: string) => `${email.trim().split("@")[0]}@${domain}`;

const recent = (sent: unknown[], now: number) => sent.filter((t): t is number => typeof t === "number" && t > now - DAY && t <= now);

/** When the next message may be sent (epoch ms), or null if it may be now: 10 minutes apart, 3 a day. */
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

export const waitText = (at: number, now: number) => {
  const min = Math.ceil((at - now) / MIN);
  return `You sent feedback recently. You can send more ${min < 60 ? `in ${min} ${min === 1 ? "minute" : "minutes"}` : `in about ${Math.ceil(min / 60)} hours`}.`;
};
