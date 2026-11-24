import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "../ui/Button.tsx";
import { DOMAINS, EMAIL_PATTERN, FEEDBACK_ACTION, FEEDBACK_SUBJECT, STARTERS, loadSent, nextAllowed, record, saveSent, waitText, withDomain } from "./feedback.ts";

const field = "w-full border-[1.5px] border-blue bg-sage px-3 py-2 text-ink";
const quick = "min-h-[44px] border-[1.5px] border-blue px-3 py-1.5 text-left text-small text-blue transition-colors duration-[140ms] hover:bg-blue hover:text-sage";

/**
 * "Is this plan right for you?" (Phase 7.3): a feedback form at the foot of the results page, folded until opened.
 * Like the owner's portfolio, it is a plain HTML form posted to Formspree in a new tab, so the plan stays open. The
 * student's email is required so we can reply; the endings and openings are one-tap fills. A hidden honeypot field
 * catches bots, and sending is limited in this browser to one every 10 minutes and 3 a day.
 */
export function FeedbackForm({ dataVersion, engineVersion, now = () => Date.now() }: { dataVersion: string; engineVersion: string; now?: () => number }) {
  const ids = useId();
  const email = useRef<HTMLInputElement>(null), message = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState("");
  const [wait, setWait] = useState<string | null>(null);

  const addDomain = (d: string) => {
    const box = email.current!; const name = box.value.trim().split("@")[0];
    box.value = withDomain(box.value, d); box.focus();
    const at = name ? box.value.length : 0; box.setSelectionRange(at, at);
    setStatus(name ? "Email ending added." : "Ending added. Now type your name before the @.");
  };
  const addStarter = (s: (typeof STARTERS)[number]) => {
    const box = message.current!; box.value = s.text; box.focus();
    const i = s.text.indexOf(s.select); box.setSelectionRange(i, i + s.select.length);
    setStatus(`Message started. Type to replace the highlighted ${s.select}.`);
  };
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const t = now(), sent = loadSent(), at = nextAllowed(sent, t);
    if (at) { e.preventDefault(); setWait(waitText(at, t)); return; }
    saveSent(record(sent, t)); setWait(null);
    setStatus("Sending in a new tab. Thank you.");
  };

  return (
    <details className="group mt-4">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        Is this plan right for you? <span className="underline underline-offset-4">Send feedback</span>
      </summary>
      <form action={FEEDBACK_ACTION} method="POST" target="_blank" onSubmit={onSubmit} className="mt-4 flex max-w-[36em] flex-col gap-3">
        <input type="hidden" name="_subject" value={FEEDBACK_SUBJECT} />
        <input type="hidden" name="built-with" value={`dataset ${dataVersion}, engine ${engineVersion}`} />

        <label htmlFor={`${ids}-email`} className="label">Your email</label>
        <input id={`${ids}-email`} ref={email} type="text" inputMode="email" name="email" required maxLength={200} autoComplete="email"
          autoCapitalize="off" spellCheck={false} pattern={EMAIL_PATTERN} title="An email address, like name@gmail.com" placeholder="yourname@example.com" className={field} />
        <div role="group" aria-label="Add an email ending" className="flex flex-wrap gap-2">
          {DOMAINS.map((d) => <button key={d} type="button" className={quick} onClick={() => addDomain(d)}>@{d}</button>)}
        </div>

        <label htmlFor={`${ids}-message`} className="label mt-2">Message</label>
        <textarea id={`${ids}-message`} ref={message} name="message" required maxLength={5000} rows={5} className={field} />
        <div role="group" aria-labelledby={`${ids}-hint`} className="flex flex-col gap-2">
          <p id={`${ids}-hint`} className="text-small">Tap one to start the message:</p>
          {STARTERS.map((s) => <button key={s.text} type="button" className={quick} onClick={() => addStarter(s)}>{s.text}</button>)}
        </div>

        {/* Honeypot: hidden from people, filled in by bots; Formspree drops anything that fills it. */}
        <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <p aria-live="polite" className="text-small">{status}</p>
        {wait && <p role="status" className="notice">{wait}</p>}
        <Button type="submit" className="self-start">Send</Button>
        <p className="text-small">
          Sent through Formspree, which receives your email, your message, and your IP address for spam filtering. Your
          plan and answers aren't sent.
        </p>
      </form>
    </details>
  );
}
