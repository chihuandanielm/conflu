import { lastChecked, needsEligibilityCheck } from "../data/resources.ts";
import { audience, contactParts, shortUrl } from "./format.ts";
import { payLabel, seasonLabel, whereLabel, type Tailored } from "./tailor.ts";

const kindLabel = (type: string) => type.replace(/[_-]+/g, " ");

/**
 * A resource box (design/DESIGN.md §7.4b): where the plan hands the student to the real world. Every word comes from
 * data/resources/*.json or the helpers in src/app/resources/; a line whose field is empty is left out.
 * `inDrawer` leaves out "Helps with" and the small print (lines 6 and 9), as the goal drawer may.
 */
export function ResourceCard({ t, identity, inDrawer = false }: { t: Tailored; identity: string[]; inDrawer?: boolean }) {
  const r = t.resource;
  const checked = lastChecked(r);
  const facts = [payLabel(r.pay), seasonLabel(r.season), r.typicalDeadline ? `Typical deadline: ${r.typicalDeadline}` : null].filter(Boolean);
  const contact = contactParts(r);
  const how = contact.find((c) => c.label === "How");
  const reach = contact.filter((c) => c.label !== "How");
  const links = [{ label: "Visit site", url: r.url }, ...(r.applyUrl ? [{ label: "Apply", url: r.applyUrl }] : [])];
  return (
    <article className="flex h-full flex-col gap-2.5 border-[1.5px] border-blue bg-sage p-5">
      {/* 1. Name, and "for students like you" (about the student, so it may be green; still said in words). */}
      <h3 className="text-lead">
        {t.forYou && <span aria-hidden="true" className="dot dot--done mr-2 align-[0.05em]" />}
        {r.name}
        {t.forYou && <span className="ml-2 text-small">For students like you</span>}
      </h3>
      {/* 2. Where it is from, and the kind of thing. */}
      <p className="fact">{whereLabel(r).toLowerCase()}{"  "}{kindLabel(r.type)}</p>
      {/* 3. What it is, in full. */}
      {r.summary && <p>{r.summary}</p>}
      {/* 4. Who it is for. */}
      <p className="text-small">{audience(r)}{needsEligibilityCheck(r, identity) ? " Check eligibility." : ""}</p>
      {/* 5. Cost or pay, season, deadline. */}
      {facts.length > 0 && <p className="fact">{facts.join("  ")}</p>}
      {/* 6. Helps with: the plan's goals that point to it. */}
      {!inDrawer && t.goals.length > 0 && <p className="text-small">Helps with: {t.goals.join("; ")}</p>}
      {/* 7. How to reach them. */}
      {(how || reach.length > 0) && (
        <div className="text-small">
          {how && <p>{how.value}</p>}
          {reach.length > 0 && (
            <p className="flex flex-wrap gap-x-4">
              {reach.map((c) => (
                <span key={c.label}>{c.label}: {c.href ? <a className="underline underline-offset-4" href={c.href}>{c.value}</a> : c.value}</span>
              ))}
            </p>
          )}
        </div>
      )}
      {/* 8. Links, then their addresses, at the foot of the box. */}
      <div className="mt-auto pt-2">
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn--small">
              {l.label} <span aria-hidden="true" className="font-mono">-&gt;</span><span className="sr-only">: {r.name} (opens in a new tab)</span>
            </a>
          ))}
        </div>
        <p className="fact mt-2 break-all">{links.map((l) => shortUrl(l.url)).filter((u, i, a) => a.indexOf(u) === i).join("  ")}</p>
      </div>
      {/* 9. Small print. */}
      {!inDrawer && checked && <p className="fact">Link last checked {checked}</p>}
      {r.status !== "active" && <p className="notice text-small">{r.statusNote ?? `Status: ${r.status}`}</p>}
    </article>
  );
}
