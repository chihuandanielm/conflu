import { Flag } from "lucide-react";
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { milestones, outcomeText } from "./summary.ts";

/** Where the student is headed, and the few milestones on the way there, in order. */
export function GoalPath({ plan, trackId, onOpen }: { plan: Plan; trackId?: string; onOpen: (it: PlanItem, t: PlanTerm) => void }) {
  const ms = milestones(plan);
  const find = (goalId: string) => {
    for (const t of plan.terms) { const it = t.items.find((i) => i.goalId === goalId); if (it) return { it, t }; }
    return null;
  };
  return (
    <section aria-labelledby="goal-h" className="rounded-md border border-border bg-surface p-5">
      <h2 id="goal-h" className="text-sm font-semibold text-muted">Where you're headed</h2>
      <p className="mt-1 flex items-start gap-2 text-xl font-semibold text-ink">
        <Flag size={20} aria-hidden="true" className="mt-1 shrink-0 text-green" />{outcomeText(trackId)}
      </p>
      {ms.length > 0 && (
        <ol aria-label="Milestones" className="mt-4 flex flex-col gap-0 sm:flex-row sm:gap-2">
          {ms.map((m, i) => {
            const hit = find(m.goalId);
            return (
              <li key={m.goalId} className="relative flex flex-1 gap-3 pb-4 sm:flex-col sm:gap-2 sm:pb-0">
                <span aria-hidden="true" className="flex items-center sm:w-full">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-blue bg-bg font-mono text-xs text-blue">{i + 1}</span>
                  {i < ms.length - 1 && <span className="ml-2 hidden h-0.5 flex-1 bg-border-strong sm:block" />}
                </span>
                <span className="min-w-0">
                  {hit ? (
                    <button type="button" onClick={() => onOpen(hit.it, hit.t)} className="text-left text-sm font-semibold text-ink hover:text-blue hover:underline">{m.title}</button>
                  ) : <span className="text-sm font-semibold text-ink">{m.title}</span>}
                  <span className="block text-xs text-muted">{m.termLabel}{m.mustDo ? " · must-do" : ""}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
