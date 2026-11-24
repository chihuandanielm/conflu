import { useState } from "react";
import type { PlanTerm } from "../../engine/types.ts";
import { Button } from "../ui/Button.tsx";

/**
 * "Already done any of these?" (docs/T4_PLAN.md §1, engine 0.13.0): the catch-ups the plan put in this semester (goals
 * past their usual time), as one-tap toggles. Picking some and pressing "Update my plan" marks them done in one re-plan,
 * so "Do this now" (just above) moves on to what the student actually needs. Shown only when this semester has catch-ups.
 */
export function AlreadyDone({ term, dismissed, onDone, onHide }: {
  term: PlanTerm; dismissed: string[]; onDone: (goalIds: string[]) => void; onHide: (key: string) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const items = term.items.filter((i) => (i.timing === "late" || i.timing === "last-chance") && !i.gate && !i.option);
  const key = `already-done:${term.code}`;
  if (!items.length || dismissed.includes(key)) return null;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <section aria-labelledby="already-done-h" className="mt-8 border-t-[1.5px] border-blue pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="already-done-h" className="label text-[1.25rem] text-blue">Already done any of these?</h2>
        <button type="button" className="btn btn--text" onClick={() => onHide(key)}>Hide</button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((it) => {
          const on = picked.includes(it.goalId);
          return (
            <li key={it.goalId}>
              <button type="button" aria-pressed={on} onClick={() => toggle(it.goalId)}
                className={`min-h-[44px] border-[1.5px] border-blue px-3 py-1.5 text-left text-small transition-colors duration-[140ms] ${on ? "border-violet bg-violet text-sage" : "text-blue hover:bg-sage"}`}>
                {it.title}
              </button>
            </li>
          );
        })}
      </ul>
      <Button className="mt-4" disabled={!picked.length} onClick={() => onDone(picked)}>Update my plan</Button>
    </section>
  );
}
