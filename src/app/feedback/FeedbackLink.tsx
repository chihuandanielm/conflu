import { useState, type MouseEvent } from "react";
import { feedbackMailto, loadSent, nextAllowed, record, saveSent } from "./feedback.ts";

const when = (at: number, now: number) => {
  const min = Math.ceil((at - now) / 60_000);
  return min < 60 ? `in ${min} ${min === 1 ? "minute" : "minutes"}` : `in about ${Math.ceil(min / 60)} hours`;
};

/**
 * "Is this plan right for you?" (Phase 7.3): opens a pre-filled email in the student's own mail app. Nothing is sent
 * by the site. Limited in this browser to one every 10 minutes and 3 a day; past the limit, it says when to try again.
 */
export function FeedbackLink({ dataVersion, engineVersion, now = () => Date.now() }: { dataVersion: string; engineVersion: string; now?: () => number }) {
  const [wait, setWait] = useState<string | null>(null);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const t = now(), sent = loadSent(), at = nextAllowed(sent, t);
    if (at) { e.preventDefault(); setWait(`You sent feedback recently. You can send more ${when(at, t)}.`); return; }
    saveSent(record(sent, t));
    setWait(null);
  };
  return (
    <p className="mt-3">
      Is this plan right for you?{" "}
      <a href={feedbackMailto({ dataVersion, engineVersion })} onClick={onClick} className="underline underline-offset-4">Email feedback</a>
      . It opens your mail app; add your email in the message so we can reply.
      {wait && <span role="status" className="notice mt-2 block">{wait}</span>}
    </p>
  );
}
