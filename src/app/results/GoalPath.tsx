import { useMemo } from "react";
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { ConfluenceMap } from "../map/ConfluenceMap.tsx";
import { mapModel } from "../map/facts.ts";
import { milestones, outcomeText } from "./summary.ts";

/** Find a goal's first placement, to open it. */
export function findItem(plan: Plan, goalId: string): { it: PlanItem; t: PlanTerm } | null {
  for (const t of plan.terms) { const it = t.items.find((i) => i.goalId === goalId); if (it) return { it, t }; }
  return null;
}

/**
 * Where you're headed (design/DESIGN.md §7.4 #4, inside "The big picture"): the outcome in one line, then the confluence map of the milestones
 * only (up to five), and "See the full map", which switches to the Map tab. The outcome is the heading above the map,
 * so the map itself leaves it off.
 */
export function GoalPath({ plan, trackId, done, onOpen, onFullMap }: {
  plan: Plan; trackId?: string; done: string[]; onOpen: (it: PlanItem, t: PlanTerm) => void; onFullMap: () => void;
}) {
  const ms = milestones(plan);
  const model = useMemo(() => mapModel(plan, "", new Set(ms.map((m) => m.goalId))), [plan, ms]);
  return (
    <section aria-labelledby="goal-h">
      <h3 id="goal-h" className="fact font-normal text-ink">Where you're headed</h3>
      <p className="label mt-1 max-w-[20em] text-[1.5rem] leading-[1.15] text-ink">{outcomeText(trackId)}</p>
      {ms.length > 0 && (
        <div className="mt-5">
          <ConfluenceMap model={model} done={done} label="Your milestones, in order, joining one river"
            termOf={(id) => ms.find((m) => m.goalId === id)?.termLabel}
            onOpen={(id) => { const hit = findItem(plan, id); if (hit) onOpen(hit.it, hit.t); }} />
        </div>
      )}
      <button type="button" className="btn btn--small mt-[18px]" onClick={onFullMap}>See the full map</button>
    </section>
  );
}
