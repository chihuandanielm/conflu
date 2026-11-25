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
      <details className="group max-w-[46em]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 font-display text-[1.375rem] font-bold [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="w-3.5 font-mono text-fact group-open:hidden">+</span>
          <span aria-hidden="true" className="hidden w-3.5 font-mono text-fact group-open:inline">-</span>
          Privacy and data
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <ul aria-label="Privacy summary" className="flex flex-wrap gap-x-5 gap-y-1.5">
            {claims.map((c) => <li key={c} className="flex items-baseline gap-2"><span aria-hidden="true" className="dot dot--done translate-y-px" />{c}</li>)}
          </ul>
          <ul aria-label="Security summary" className="fact flex flex-wrap gap-x-5 gap-y-1">
            {sub.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <p>It doesn't set cookies, there's no analytics or tracking, and there's nothing to sign up for.</p>
          <p>
            Under the hood it's just files (pages, fonts, and the data the plans are made from) handed to your browser by GitHub Pages. Your plan is
            worked out in your browser, on your device. So you can come back to it, your answers, your plan, and the steps and courses you tick are kept
            in this browser's local storage, and nowhere else. The only other things it keeps are a small note that the landing's painting has already
            played, so it doesn't paint again each time (that one disappears when you close the tab), and, if you send feedback, when you sent it, so
            the form can stop repeats. Clearing this site's data in your browser removes all of it.
          </p>
          <p>
            A share link carries your answers in the part of the address after the #, which browsers don't send to any server, and it leaves out your
            answers about identity, gender, and citizenship. The PDF is made in your browser too.
          </p>
          <p className="label">A few outside services do touch your visit:</p>
          <dl className="grid gap-x-5 gap-y-2 min-[600px]:grid-cols-[9em_1fr]">
            <dt className="label">GitHub Pages</dt>
            <dd>hosts the site, so it sees standard request info, including IP addresses, the way any host does. That stays with GitHub under their privacy statement.</dd>
            <dt className="label">Formspree</dt>
            <dd>only hears from you if you use the feedback form on your plan. It gets your email and message, plus your IP address for spam filtering.</dd>
          </dl>
          <p>
            On the security side, the page only runs code from this site and doesn't tell other sites where you came from when you click away. The fonts
            are hosted here, not by Google.
          </p>
          <p>If you spot something off, the feedback form at the bottom of your plan reaches me directly.</p>
        </div>
      </details>
    </footer>
  );
}
