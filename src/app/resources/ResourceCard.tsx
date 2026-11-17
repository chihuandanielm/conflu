import { ArrowUpRight } from "lucide-react";
import { lastChecked, needsEligibilityCheck } from "../data/resources.ts";
import { audience, contactParts } from "./format.ts";
import { payLabel, seasonLabel, whereLabel, type Tailored } from "./tailor.ts";

export function ResourceCard({ t, identity }: { t: Tailored; identity: string[] }) {
  const r = t.resource;
  const checked = lastChecked(r);
  const facts = [payLabel(r.pay), seasonLabel(r.season), r.typicalDeadline ? `Typical deadline: ${r.typicalDeadline}` : null].filter(Boolean);
  return (
    <article className="flex flex-col gap-2 border border-blue bg-sage p-4">
      <header className="flex flex-wrap items-start gap-2">
        <h4 className="flex-1 text-blue">{r.name}</h4>
        <span className="bg-sage px-1.5 py-0.5 text-small text-blue">{whereLabel(r)}</span>
        {t.forYou && <span className="bg-sage px-1.5 py-0.5 text-small text-blue">For students like you</span>}
      </header>
      <p className="text-small text-blue">{r.summary}</p>
      <p className="text-small text-blue">{audience(r)}{needsEligibilityCheck(r, identity) ? " Check eligibility." : ""}</p>
      {facts.length > 0 && <p className="text-small text-blue">{facts.join(" · ")}</p>}
      {t.goals.length > 0 && <p className="text-small text-blue">Helps with: {t.goals.join("; ")}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-small">
        {contactParts(r).map((c) => (
          <div key={c.label} className="contents">
            <dt className="text-blue">{c.label}</dt>
            <dd className="text-blue">{c.href ? <a className="text-blue underline-offset-2 hover:underline" href={c.href}>{c.value}</a> : c.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue underline-offset-2 hover:underline">
          Visit site<ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only">: {r.name} (opens in a new tab)</span>
        </a>
        {r.applyUrl && (
          <a href={r.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue underline-offset-2 hover:underline">
            Apply<ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only">: {r.name} (opens in a new tab)</span>
          </a>
        )}
        {checked && <span className="text-small text-blue">Link last checked {checked}</span>}
      </div>
      {r.status !== "active" && <p className="text-small text-blue">{r.statusNote ?? `Status: ${r.status}`}</p>}
    </article>
  );
}
