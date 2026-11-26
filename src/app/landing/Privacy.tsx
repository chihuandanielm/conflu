/**
 * Privacy and data (the landing's last section), in the shape of the owner's portfolio: a folded note with the short
 * claims first, then a plain account. Every claim is checked against the code: storage keys in src/app/state/ and
 * src/app/feedback/, the CSP and referrer policy in vite.config.ts and index.html, self-hosted fonts in styles.css, and
 * Formspree only behind the feedback form (CLAUDE.md). Keep it true when any of those change.
 */
export function Privacy() {
  const claims = ["No cookies from this site", "No tracking or analytics", "No accounts", "Your plan is built on your device"];
  const sub = ["Self-hosted fonts", "Strict content security policy", "HTTPS only"];
  return (
    <footer className="mt-12 border-t-[1.5px] border-blue py-8 min-[760px]:mt-16">
      <details className="group mx-auto max-w-[46em]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-3 font-display text-[1.375rem] font-bold [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="w-3.5 font-mono text-fact group-open:hidden">+</span>
          <span aria-hidden="true" className="hidden w-3.5 font-mono text-fact group-open:inline">-</span>
          Privacy and data
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <ul aria-label="Privacy summary" className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
            {claims.map((c) => <li key={c} className="flex items-baseline gap-2"><span aria-hidden="true" className="dot dot--done translate-y-px" />{c}</li>)}
          </ul>
          <ul aria-label="Security summary" className="fact flex flex-wrap justify-center gap-x-5 gap-y-1">
            {sub.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <p className="kicker mt-2">on your device</p>
          <dl className="grid gap-x-5 gap-y-2 min-[600px]:grid-cols-[9em_1fr]">
            <dt className="label">Your plan</dt>
            <dd>Built in your browser. Your answers, plan, ticked steps and ticked courses are saved in this browser's local storage. They aren't sent to any server.</dd>
            <dt className="label">Also saved</dt>
            <dd>A note that the landing painting has played (deleted when you close the tab). If you send feedback, the time you sent it.</dd>
            <dt className="label">Deleting it</dt>
            <dd>Clear this site's data in your browser settings.</dd>
            <dt className="label">Share links</dt>
            <dd>Your answers go after the # in the link. Browsers don't send that part to servers. Identity, gender and citizenship answers are left out.</dd>
            <dt className="label">PDF</dt>
            <dd>Made in your browser.</dd>
          </dl>
          <p className="kicker mt-2">outside services</p>
          <dl className="grid gap-x-5 gap-y-2 min-[600px]:grid-cols-[9em_1fr]">
            <dt className="label">GitHub Pages</dt>
            <dd>Hosts the site. Gets standard request data, including your IP address. GitHub's privacy statement applies.</dd>
            <dt className="label">Formspree</dt>
            <dd>Only used if you send feedback. Gets your email, your message and your IP address.</dd>
          </dl>
          <p className="kicker mt-2">security</p>
          <dl className="grid gap-x-5 gap-y-2 min-[600px]:grid-cols-[9em_1fr]">
            <dt className="label">Code</dt>
            <dd>Only code from this site runs on the page.</dd>
            <dt className="label">Links</dt>
            <dd>Other sites aren't told you came from here.</dd>
            <dt className="label">Fonts</dt>
            <dd>Hosted on this site.</dd>
          </dl>
          <p>Questions or problems: use the feedback form at the bottom of your plan.</p>
        </div>
      </details>
    </footer>
  );
}
