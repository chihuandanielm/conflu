import { useState } from "react";
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { GoalRow } from "./GoalRow.tsx";
import { inWorkOrder } from "./order.ts";
import { SectionHead } from "./SectionHead.tsx";
import { moreTime } from "./summary.ts";

const OPEN = 2, MORE = 3;

/**
 * Coming up (design/DESIGN.md §7.4 #3): one fold per semester after this one, as a labelled band ("+" / "-", the
 * semester in bold, the count): an open band is solid blue, a folded one outlined. The next two are open, each holding
 * the same ruled rows, smaller and without the next step. Then "When you have more time":
 * the goals that join the plan next, which the student can also start early.
 */
export function ComingUp({ plan, done, onOpen }: { plan: Plan; done: string[]; onOpen: (it: PlanItem, t: PlanTerm) => void }) {
  const [allMore, setAllMore] = useState(false);
  const later = plan.terms.slice(1);
  const extra = moreTime(plan);
  if (!later.length && !extra.length) return null;
  return (
    <section aria-labelledby="coming-h">
      <SectionHead id="coming-h" title="Coming up" count={`${later.length} ${later.length === 1 ? "semester" : "semesters"}`} />
      {later.map((t, i) => (
        <details key={t.code} open={i < OPEN} className="group mt-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-baseline gap-3 border-[1.5px] border-blue px-3 py-2 text-blue group-open:bg-blue group-open:text-sage [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="w-3.5 font-mono group-open:hidden">+</span>
            <span aria-hidden="true" className="hidden w-3.5 font-mono group-open:inline">-</span>
            <span className="label flex-1 text-[1.1875rem]">{t.label}</span>
            <span className="fact">{t.items.length ? `${t.items.length} ${t.items.length === 1 ? "goal" : "goals"}` : t.capacityHours === 0 ? "a break" : "open"}</span>
          </summary>
          {t.items.length > 0 ? (
            <ol>
              {inWorkOrder(t.items, plan.edges).map((it) => (
                <li key={it.goalId}><GoalRow small it={it} termCode={t.code} done={done.includes(it.goalId)} onOpen={() => onOpen(it, t)} /></li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-small">{t.capacityHours === 0 ? "A break: no plan this term." : "Open: a good time to start something from below."}</p>
          )}
        </details>
      ))}
      {extra.length > 0 && (
        <section aria-labelledby="more-h" className="mt-6">
          <h3 id="more-h" className="text-[1.25rem]">When you have more time</h3>
          <p className="mt-1.5 text-small">Done early, or have a free week? These come next. Start any of them whenever you like.</p>
          <ul className="mt-2">
            {(allMore ? extra : extra.slice(0, MORE)).map((b) => (
              <li key={b.goalId} className="flex items-baseline gap-3 py-[7px]">
                <span aria-hidden="true" className="dot translate-y-px" />
                <span>{b.title}{/^Comes after/.test(b.reason) && <span className="block text-small">{b.reason}</span>}</span>
              </li>
            ))}
          </ul>
          {extra.length > MORE && (
            <button type="button" aria-expanded={allMore} onClick={() => setAllMore((x) => !x)} className="btn btn--text">
              {allMore ? "Show fewer" : `Show all ${extra.length}`}
            </button>
          )}
        </section>
      )}
    </section>
  );
}
