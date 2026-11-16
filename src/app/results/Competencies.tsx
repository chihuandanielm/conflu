import type { Competency, Plan } from "../../engine/types.ts";
import { competencyNames } from "../data/dataset.ts";

const ORDER: Competency[] = ["csd", "comm", "crit", "equity", "lead", "prof", "team", "tech"];
const pct = (x: number | undefined) => Math.round((x ?? 0) * 100);

/** Current vs. target for each NACE competency, as horizontal bars. */
export function Competencies({ c }: { c: Plan["competencies"] }) {
  return (
    <section aria-labelledby="skills-h">
      <h2 id="skills-h" className="text-xl font-semibold">Your skills picture</h2>
      <p className="mt-1 text-sm text-muted">Where you are now on the eight career readiness competencies, against where this plan aims to get you.</p>
      <ul className="mt-4 flex flex-col gap-3">
        {ORDER.map((k) => (
          <li key={k} className="grid grid-cols-1 gap-1 sm:grid-cols-[14rem_1fr_6rem] sm:items-center sm:gap-4">
            <span className="text-sm text-ink">{competencyNames[k]}</span>
            <div className="relative h-3 rounded-full bg-surface ring-1 ring-border" role="img"
              aria-label={`${competencyNames[k]}: ${pct(c.current[k])}% now, target ${pct(c.target[k])}%`}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-green" style={{ width: `${pct(c.current[k])}%` }} />
              <div className="absolute inset-y-[-3px] w-0.5 rounded bg-ink" style={{ left: `calc(${pct(c.target[k])}% - 1px)` }} />
            </div>
            <span className="font-mono text-xs text-muted sm:text-right">{pct(c.current[k])} / {pct(c.target[k])}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-green" aria-hidden="true" />Now</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-ink" aria-hidden="true" />Target</span>
      </p>
    </section>
  );
}
