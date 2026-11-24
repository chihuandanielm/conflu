import { useState } from "react";
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { GoalRow } from "./GoalRow.tsx";
import { inWorkOrder } from "./order.ts";
import { moreTime } from "./summary.ts";

const MORE = 6;

/** The fold a semester belongs to: its year as labelled (the real year, engine 0.13.0), or after graduation. */
const yearOf = (t: PlanTerm) => { const m = /year (\d)/i.exec(t.label); return m ? `Year ${m[1]}` : "After graduation"; };

/** The same labelled band for every fold: "+" / "-", the label in bold, then a count. Solid blue while open. */
function Band({ label, count }: { label: string; count: string }) {
  return (
    <summary className="flex min-h-11 cursor-pointer list-none items-baseline gap-3 border-[1.5px] border-blue px-3 py-2 text-blue group-open:bg-blue group-open:text-sage [&::-webkit-details-marker]:hidden">
      <span aria-hidden="true" className="w-3.5 font-mono group-open:hidden">+</span>
      <span aria-hidden="true" className="hidden w-3.5 font-mono group-open:inline">-</span>
      <span className="label flex-1 text-[1.1875rem]">{label}</span>
      <span className="fact">{count}</span>
    </summary>
  );
}
const goals = (n: number) => `${n} ${n === 1 ? "goal" : "goals"}`;

/**
 * Semester by semester (Phase 4.1, inside "Your path"): every semester after this one, folded into one closed row per
 * year, so the page stays short and a student opens only the year they want. Inside a year, each semester has its own
 * small heading and the same ruled rows. Then "When you have more time", folded too: the goals that join the plan
 * next, which the student can also start early.
 */
export function ComingUp({ plan, done, onOpen }: { plan: Plan; done: string[]; onOpen: (it: PlanItem, t: PlanTerm) => void }) {
  const [allMore, setAllMore] = useState(false);
  const later = plan.terms.slice(1);
  const extra = moreTime(plan);
  if (!later.length && !extra.length) return null;
  const years: { label: string; terms: PlanTerm[] }[] = [];
  for (const t of later) {
    const y = yearOf(t), last = years.at(-1);
    if (last?.label === y) last.terms.push(t); else years.push({ label: y, terms: [t] });
  }
  return (
    <div>
      {later.length > 0 && <h3 className="text-[1.25rem]">Semester by semester</h3>}
      {years.map((y) => {
        const n = y.terms.reduce((s, t) => s + t.items.length, 0);
        return (
          <details key={y.label} data-year={y.label} className="group mt-3">
            <Band label={y.label} count={`${y.terms.length} ${y.terms.length === 1 ? "semester" : "semesters"} · ${goals(n)}`} />
            {y.terms.map((t) => (
              <section key={t.code} aria-label={t.label} className="mt-3">
                <p className="flex items-baseline justify-between gap-3 border-b-[1.5px] border-blue pb-1">
                  <span className="label text-blue">{t.label}</span>
                  <span className="fact">{t.items.length ? goals(t.items.length) : t.capacityHours === 0 ? "a break" : "open"}</span>
                </p>
                {t.items.length > 0 ? (
                  <ol>
                    {inWorkOrder(t.items, plan.edges).map((it) => (
                      <li key={it.goalId}><GoalRow small it={it} termCode={t.code} done={done.includes(it.goalId)} onOpen={() => onOpen(it, t)} /></li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-small">{t.capacityHours === 0 ? "A break: no plan this term." : "Open: a good time to start something from below."}</p>
                )}
              </section>
            ))}
          </details>
        );
      })}
      {extra.length > 0 && (
        <details className="group mt-3">
          <Band label="When you have more time" count={goals(extra.length)} />
          <p className="mt-3 text-small">Done early, or have a free week? These come next. Start any of them whenever you like.</p>
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
        </details>
      )}
    </div>
  );
}
