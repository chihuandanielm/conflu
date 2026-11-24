import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import type { Answers } from "../intake/model.ts";
import { havesWithCredit, needs } from "./summary.ts";

const SHOWN = 8;

/** What you have (green dots: things done) and what you need (open dots, with when). Two columns, one on a phone. */
export function HaveNeed({ plan, answers, onOpen }: { plan: Plan; answers: Answers; onOpen: (it: PlanItem, t: PlanTerm) => void }) {
  const have = havesWithCredit(answers);
  const need = needs(plan);
  const termOf = (code: string) => plan.terms.find((t) => t.code === code)!;
  return (
    <div className="grid gap-x-12 gap-y-8 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      <section aria-labelledby="have-h">
        <h3 id="have-h" className="text-[1.375rem]">What you have</h3>
        {have.length ? (
          <ul className="mt-3">
            {have.slice(0, SHOWN).map((h) => (
              <li key={h.label} className="flex items-baseline gap-3 py-[7px]">
                <span aria-hidden="true" className="dot dot--done translate-y-px" />
                {/* Phase 5.3: what each answer counts for in the plan. */}
                <span>{h.label}{h.covers.length > 0 && <span className="block text-small">Counts for: {h.covers.join("; ")}</span>}</span>
              </li>
            ))}
            {have.length > SHOWN && <li className="py-[7px] text-small">and {have.length - SHOWN} more</li>}
          </ul>
        ) : (
          <p className="mt-3">Nothing yet, and that's normal. Every plan starts with a first step.</p>
        )}
      </section>
      <section aria-labelledby="need-h">
        <h3 id="need-h" className="text-[1.375rem]">What you need</h3>
        <ul className="mt-3">
          {need.map((n) => (
            <li key={n.label}>
              <button type="button" onClick={() => onOpen(n.item, termOf(n.term))} className="group flex w-full items-baseline gap-3 py-[7px] text-left">
                <span aria-hidden="true" className="dot translate-y-px" />
                <span>
                  <span className="label block text-blue underline-offset-4 group-hover:underline">{n.label}</span>
                  <span className="block text-small">{n.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
