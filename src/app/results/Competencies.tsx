import type { Competency, Plan } from "../../engine/types.ts";
import { competencyNames } from "../data/dataset.ts";

const ORDER: Competency[] = ["csd", "comm", "crit", "equity", "lead", "prof", "team", "tech"];
const pct = (x: number | undefined) => Math.round((x ?? 0) * 100);

/**
 * The skills picture (design/DESIGN.md §7.4, full map): one row per competency, the name on the left, a 1.5px line
 * from 0 to 1 with a green dot at "now" and an open blue ring at "target".
 */
export function Competencies({ c }: { c: Plan["competencies"] }) {
  return (
    <section aria-labelledby="skills-h">
      <h2 id="skills-h" className="text-h2">Your skills picture</h2>
      <p className="mt-2 max-w-[40em]">Where you are now on the eight career readiness competencies, against where this plan aims to get you.</p>
      <p className="fact mt-3 flex items-center gap-5">
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="dot dot--done" />now</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="dot" />target</span>
      </p>
      <ul className="mt-3 border-t-[1.5px] border-blue">
        {ORDER.map((k) => (
          <li key={k} className="grid grid-cols-1 items-center gap-x-6 gap-y-2 border-b-[1.5px] border-blue py-3 sm:grid-cols-[14rem_1fr]">
            <span>{competencyNames[k]}</span>
            <div role="img" aria-label={`${competencyNames[k]}: ${pct(c.current[k])}% now, target ${pct(c.target[k])}%`} className="relative mx-1.5 h-3">
              <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-0 border-t-[1.5px] border-blue" />
              <span aria-hidden="true" className="dot absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pct(c.target[k])}%` }} />
              <span aria-hidden="true" className="dot dot--done absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pct(c.current[k])}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
