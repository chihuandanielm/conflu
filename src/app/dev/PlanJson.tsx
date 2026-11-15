// Milestone 1 check: the engine runs in the browser on the bundled data.
import { useMemo } from "react";
import { buildPlan, ENGINE_VERSION } from "../../engine/engine.ts";
import type { PlanInput } from "../../engine/types.ts";
import { dataset } from "../data/dataset.ts";
import { todayISO } from "../today.ts";

export const sampleStudent: Omit<PlanInput, "today"> = {
  status: "college-student",
  majorId: "computer-science",
  year: 2,
  trackId: "software-engineering",
  horizon: "graduation",
  weeklyHours: 5,
  summer: "full",
  school: "rutgers-nb",
  location: "nj",
  experience: ["resume", "club"],
  skills: ["python"],
};

export function PlanJson() {
  const today = todayISO();
  const plan = useMemo(() => buildPlan({ ...sampleStudent, today }, dataset), [today]);
  const items = plan.terms.reduce((n, t) => n + t.items.length, 0);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-semibold">Engine check</h1>
      <p className="mt-2 text-muted">
        CS sophomore on the software engineering track, by graduation, 5 hours a week, today {today}.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Engine", ENGINE_VERSION],
          ["Data", plan.meta.dataVersion],
          ["Terms", String(plan.terms.length)],
          ["Placed items", String(items)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-border bg-surface p-4">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="mt-1 font-mono text-sm">{v}</dd>
          </div>
        ))}
      </dl>
      <pre
        aria-label="Plan output as JSON"
        className="mt-6 max-h-[70vh] overflow-auto rounded-md border border-border bg-surface p-4 font-mono text-xs"
      >
        {JSON.stringify(plan, null, 2)}
      </pre>
    </main>
  );
}
