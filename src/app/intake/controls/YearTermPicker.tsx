import { useEffect, useId, useRef, useState } from "react";
import { Check } from "lucide-react";
import { intake } from "../../data/dataset.ts";
import type { Answers } from "../model.ts";
import { SingleChoice } from "./SingleChoice.tsx";

type YearTerm = (typeof intake.yearTerms)[number];
const FIFTH = "5+";
/** "Second year, fall semester" → ["Second year", "Fall semester"]. Labels come from data/intake.json yearTerms. */
const split = (t: YearTerm) => { const [y, s = ""] = t.label.split(", "); return [y, s.charAt(0).toUpperCase() + s.slice(1)] as const; };
const YEARS = [...new Map(intake.yearTerms.map((t) => [t.id === FIFTH ? FIFTH : String(t.year), split(t)[0]])).entries()]
  .map(([value, label]) => ({ value, label }));

export type YearPatch = Pick<Answers, "year" | "semester" | "yearTerm">;

/**
 * Year and semester in two small steps instead of one list of nine: pick the year (5 choices), then that pick
 * collapses to a summary with "Change year" and fall/spring takes its place. "Fifth year or later" needs no semester.
 */
export function YearTermPicker({ a, onPick, invalid, describedBy }: {
  a: Answers; onPick: (patch: YearPatch) => void; invalid?: boolean; describedBy?: string;
}) {
  const yearValue = a.yearTerm === FIFTH ? FIFTH : a.year ? String(a.year) : undefined;
  const [editing, setEditing] = useState(!yearValue);
  const yearsId = useId(), semId = useId();
  const semGroup = useRef<HTMLDivElement>(null);
  const justPicked = useRef(false);
  const year = YEARS.find((y) => y.value === yearValue);
  const terms = intake.yearTerms.filter((t) => t.id !== FIFTH && String(t.year) === yearValue);

  // After a year is picked, the year list goes away; put focus on the semester choice that replaces it.
  useEffect(() => {
    if (justPicked.current && !editing) { justPicked.current = false; semGroup.current?.querySelector<HTMLButtonElement>("[role=radio]")?.focus(); }
  }, [editing]);

  const pickYear = (v: string) => {
    justPicked.current = true;
    setEditing(false);
    if (v === FIFTH) { const t = intake.yearTerms.find((x) => x.id === FIFTH)!; onPick({ yearTerm: t.id, year: t.year as 4, semester: t.semester as 2 }); return; }
    if (v === yearValue) return; // same year: keep the semester already picked
    onPick({ year: Number(v) as 1 | 2 | 3 | 4, semester: undefined, yearTerm: undefined });
  };

  if (editing || !year) {
    return (
      <div className="flex flex-col gap-2">
        <p id={yearsId} className="text-sm font-semibold text-ink">Which year are you in?</p>
        <SingleChoice labelledBy={yearsId} numberKeys={false} value={yearValue} onSelect={pickYear}
          choices={YEARS} invalid={invalid && !yearValue} describedBy={!yearValue ? describedBy : undefined} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-md border border-blue bg-blue-tint px-4 py-3">
        <Check size={18} strokeWidth={2.5} aria-hidden="true" className="shrink-0 text-blue" />
        <span className="flex-1 font-semibold text-ink">{year.label}</span>
        <button type="button" onClick={() => setEditing(true)}
          className="min-h-11 rounded-sm px-2 text-sm font-semibold text-blue underline underline-offset-2 hover:text-blue-hover">
          Change year
        </button>
      </div>
      {terms.length > 0 && (
        <div ref={semGroup} className="flex flex-col gap-2">
          <p id={semId} className="text-sm font-semibold text-ink">Which semester of your {year.label.toLowerCase()}?</p>
          <SingleChoice labelledBy={semId} numberKeys={false} value={a.yearTerm ?? terms.find((t) => t.semester === a.semester)?.id}
            onSelect={(id) => { const t = terms.find((x) => x.id === id)!; onPick({ yearTerm: t.id, year: t.year as 1 | 2 | 3 | 4, semester: t.semester as 1 | 2 }); }}
            choices={terms.map((t) => ({ value: t.id, label: split(t)[1] }))} invalid={invalid} describedBy={describedBy} />
        </div>
      )}
    </div>
  );
}
