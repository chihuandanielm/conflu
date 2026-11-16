import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { moreTime } from "./summary.ts";
import { Tag } from "./Tag.tsx";

const NEXT_TERMS = 2, MORE = 3;

/**
 * After this semester: the next two semesters in full, later semesters folded, and "when you have more time" right
 * here (not at the bottom of the page): the goals that join the plan next, which the student can also start early.
 */
export function ComingUp({ plan, onOpen }: { plan: Plan; onOpen: (it: PlanItem, t: PlanTerm) => void }) {
  const [allMore, setAllMore] = useState(false);
  const later = plan.terms.slice(1);
  const soon = later.slice(0, NEXT_TERMS), rest = later.slice(NEXT_TERMS);
  const extra = moreTime(plan);
  const row = (t: PlanTerm, it: PlanItem) => (
    <li key={`${t.code}-${it.goalId}`}>
      <button type="button" onClick={() => onOpen(it, t)} className="group flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-surface">
        <span className="flex-1 text-sm text-ink group-hover:text-blue">{it.title}</span>
        {it.gate && <Tag tone="gate">Must-do</Tag>}
        {it.partial && <Tag tone="partial">Continues</Tag>}
        <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />
      </button>
    </li>
  );
  if (!later.length && !extra.length) return null;
  return (
    <section aria-labelledby="coming-h" className="flex flex-col gap-4">
      <h2 id="coming-h" className="text-xl font-semibold">Coming up</h2>
      {soon.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {soon.map((t) => (
            <section key={t.code} aria-labelledby={`soon-${t.code}`} className="rounded-md border border-border p-4">
              <h3 id={`soon-${t.code}`} className="font-semibold">{t.label}</h3>
              {t.items.length ? <ul className="mt-2">{t.items.map((it) => row(t, it))}</ul>
                : <p className="mt-2 text-sm text-muted">{t.capacityHours === 0 ? "A break: no plan this term." : "Open: a good time to start something from below."}</p>}
            </section>
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <details className="rounded-md border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Later: {rest.map((t) => t.label).join(", ")}</summary>
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
            {rest.map((t) => (
              <section key={t.code} aria-labelledby={`later-${t.code}`}>
                <h3 id={`later-${t.code}`} className="text-sm font-semibold text-muted">{t.label}</h3>
                {t.items.length ? <ul>{t.items.map((it) => row(t, it))}</ul> : <p className="px-2 py-1 text-sm text-muted">Nothing planned.</p>}
              </section>
            ))}
          </div>
        </details>
      )}
      {extra.length > 0 && (
        <section aria-labelledby="more-h" className="rounded-md border border-border bg-surface p-4">
          <h3 id="more-h" className="font-semibold">When you have more time</h3>
          <p className="mt-1 text-sm text-muted">Done early, or have a free week? These come next. Start any of them whenever you like.</p>
          <ol className="mt-3 flex flex-col gap-2">
            {(allMore ? extra : extra.slice(0, MORE)).map((b, i) => (
              <li key={b.goalId} className="flex gap-3 text-sm">
                <span className="w-5 shrink-0 font-mono text-muted">{i + 1}</span>
                <span><span className="font-semibold text-ink">{b.title}</span>
                  {/^Comes after/.test(b.reason) && <span className="block text-xs text-muted">{b.reason}</span>}</span>
              </li>
            ))}
          </ol>
          {extra.length > MORE && (
            <button type="button" aria-expanded={allMore} onClick={() => setAllMore((x) => !x)}
              className="mt-2 min-h-11 px-1 text-sm text-blue underline underline-offset-2 hover:text-blue-hover">
              {allMore ? "Show fewer" : `Show all ${extra.length}`}
            </button>
          )}
        </section>
      )}
    </section>
  );
}
