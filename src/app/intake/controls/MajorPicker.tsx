import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
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
      <div className="relative">
        <label htmlFor={inputId} className="sr-only">Search majors</label>
        <Search size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input id={inputId} type="search" autoFocus aria-describedby={labelledBy} value={q} autoComplete="off" placeholder="Search majors"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { e.preventDefault(); e.stopPropagation(); onSelect(matches[0].id); } }}
          className="min-h-11 w-full rounded-md border border-border-strong bg-bg pr-3 pl-10 text-base placeholder:text-muted" />
      </div>
      <p className="sr-only" aria-live="polite">{matches.length} majors match</p>
      <div className="max-h-[50vh] overflow-y-auto pr-1">
        {matches.length ? (
          <SingleChoice labelledBy={labelledBy} numberKeys={false} invalid={invalid} describedBy={describedBy} value={value} onSelect={onSelect}
            choices={matches.map((m) => ({ value: m.id, label: m.name }))} />
        ) : (
          <p className="text-muted">
            No majors match. This version covers {sorted.length} majors{campus ? ` offered at ${campus.name}` : " offered at Rutgers"}.
          </p>
        )}
      </div>
    </div>
  );
}
