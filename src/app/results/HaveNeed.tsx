import { Check, ArrowRight } from "lucide-react";
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import type { Answers } from "../intake/model.ts";
import { haves, needs } from "./summary.ts";

const SHOWN = 8;

/** Strengths first (the student's own answers), then the few things that matter most for the goal. */
export function HaveNeed({ plan, answers, onOpen }: { plan: Plan; answers: Answers; onOpen: (it: PlanItem, t: PlanTerm) => void }) {
  const have = haves(answers);
  const need = needs(plan);
  const termOf = (code: string) => plan.terms.find((t) => t.code === code)!;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section aria-labelledby="have-h" className="rounded-md border border-border p-5">
        <h2 id="have-h" className="text-lg font-semibold">What you have</h2>
        {have.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {have.slice(0, SHOWN).map((h) => (
              <li key={h} className="inline-flex items-center gap-1.5 rounded-full bg-green-tint px-3 py-1 text-sm text-ink">
                <Check size={14} strokeWidth={2.5} aria-hidden="true" className="text-green" />{h}
              </li>
            ))}
            {have.length > SHOWN && <li className="px-1 py-1 text-sm text-muted">and {have.length - SHOWN} more</li>}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Nothing yet, and that's normal. Every plan starts with a first step.</p>
        )}
      </section>
      <section aria-labelledby="need-h" className="rounded-md border border-border p-5">
        <h2 id="need-h" className="text-lg font-semibold">What you need</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {need.map((n) => (
            <li key={n.label}>
              <button type="button" onClick={() => onOpen(n.item, termOf(n.term))} className="group flex w-full items-start gap-2 text-left">
                <ArrowRight size={16} aria-hidden="true" className="mt-1 shrink-0 text-blue" />
                <span>
                  <span className="block text-sm font-semibold text-ink group-hover:text-blue group-hover:underline">{n.label}</span>
                  <span className="block text-xs text-muted">{n.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
