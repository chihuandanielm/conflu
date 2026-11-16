import { useState } from "react";
import type { Plan } from "../../engine/types.ts";

const FIRST = 5;

/**
 * What comes after this term's goals, in order. Nothing here is overdue: as goals get checked off (or hours are added),
 * the next ones move into the plan. Goals outside this time frame sit in a closed "not in this plan" list.
 */
export function UpNext({ backlog }: { backlog: Plan["backlog"] }) {
  const [all, setAll] = useState(false);
  const next = backlog.filter((b) => b.kind === "next");
  const rest = backlog.filter((b) => b.kind !== "next");
  if (!backlog.length) return null;
  const shown = all ? next : next.slice(0, FIRST);
  return (
    <section aria-labelledby="upnext-h" className="flex flex-col gap-4">
      {next.length > 0 && (
        <div>
          <h2 id="upnext-h" className="text-xl font-semibold">Up next</h2>
          <p className="mt-1 text-sm text-muted">When you finish a goal or have more time, these join your plan in this order. Nothing here is overdue.</p>
          <ol className="mt-4 flex flex-col divide-y divide-border rounded-md border border-border">
            {shown.map((b, i) => (
              <li key={b.goalId} className="flex gap-3 px-4 py-3">
                <span className="w-6 shrink-0 font-mono text-sm text-muted">{i + 1}</span>
                <div>
                  <p className="font-semibold">{b.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{b.reason}</p>
                </div>
              </li>
            ))}
          </ol>
          {next.length > FIRST && (
            <button type="button" aria-expanded={all} onClick={() => setAll((x) => !x)}
              className="mt-2 min-h-11 px-1 text-sm text-blue underline underline-offset-2 hover:text-blue-hover">
              {all ? "Show fewer" : `Show all ${next.length}`}
            </button>
          )}
        </div>
      )}
      {rest.length > 0 && (
        <details className="rounded-md border border-border">
          <summary className="cursor-pointer px-4 py-3">
            <h2 id={next.length ? undefined : "upnext-h"} className="inline text-base font-semibold">Not in this plan</h2>
            <span className="ml-2 text-sm text-muted">{rest.length} optional or outside your time frame</span>
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {rest.map((b) => (
              <li key={b.goalId} className="px-4 py-3">
                <p className="font-semibold">{b.title}</p>
                <p className="mt-0.5 text-sm text-muted">{b.reason}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
