import { useId, useMemo, useState } from "react";
import { campuses } from "../../data/dataset.ts";
import { majorsFor, type School } from "../model.ts";
import { SingleChoice } from "./SingleChoice.tsx";

/** Searchable list of the majors offered at the student's campus. Enter in the search box picks the first match. */
export function MajorPicker({ value, onSelect, labelledBy, school, invalid, describedBy }: {
  value?: string; onSelect: (id: string) => void; labelledBy: string; school?: School; invalid?: boolean; describedBy?: string;
}) {
  const [q, setQ] = useState("");
  const inputId = useId();
  const sorted = useMemo(() => [...majorsFor(school)].sort((a, b) => a.name.localeCompare(b.name)), [school]);
  const campus = campuses.find((c) => c.school === school);
  const matches = sorted.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={inputId} className="sr-only">Search majors</label>
        <input id={inputId} type="search" autoFocus aria-describedby={labelledBy} value={q} autoComplete="off" placeholder="Search majors"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { e.preventDefault(); e.stopPropagation(); onSelect(matches[0].id); } }}
          className="min-h-12 w-full border-0 border-b-[1.5px] border-blue bg-sage px-0 text-body placeholder:text-blue" />
      </div>
      <p className="sr-only" aria-live="polite">{matches.length} majors match</p>
      <div>
        {matches.length ? (
          <SingleChoice labelledBy={labelledBy} numberKeys={false} invalid={invalid} describedBy={describedBy} value={value} onSelect={onSelect}
            choices={matches.map((m) => ({ value: m.id, label: m.name }))} />
        ) : (
          <p>
            No majors match. This version covers {sorted.length} majors{campus ? ` offered at ${campus.name}` : " offered at Rutgers"}.
          </p>
        )}
      </div>
    </div>
  );
}
