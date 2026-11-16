import { useState } from "react";
import { rankExperienceGroups, rankOptions, type ChecklistOption } from "../model.ts";
import { ChipList } from "./ChipChecklist.tsx";

const PER_GROUP = 3;

/**
 * Experience: grouped, groups in order of relevance to the track and major. Each group shows its most relevant
 * options (plus anything already picked) and ends in a "+" chip that reveals the rest of that group.
 */
export function ExperienceChips({ majorId, trackId, selected, onToggle }: {
  majorId?: string; trackId?: string; selected: string[]; onToggle: (id: string) => void;
}) {
  const groups = rankExperienceGroups(majorId, trackId);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => {
        const isOpen = open.has(g.id);
        const shown = isOpen ? g.options : g.options.filter((o, i) => (i < PER_GROUP && o.score > 0) || selected.includes(o.id));
        const hidden = g.options.filter((o) => !shown.includes(o));
        return (
          <section key={g.id} aria-labelledby={`grp-${g.id}`}>
            <h2 id={`grp-${g.id}`} className="mb-2 text-sm font-semibold text-muted">{g.label}</h2>
            <ChipList label={g.label} chips={shown} selected={selected} onToggle={onToggle}
              focusId={isOpen ? focusId : null}
              more={hidden.length ? { count: hidden.length, label: g.label, onExpand: () => {
                setOpen((s) => new Set(s).add(g.id));
                setFocusId(hidden[0].id);
              } } : undefined} />
          </section>
        );
      })}
    </div>
  );
}

/** Skills or certifications: one list, most relevant first; the first `initial` shown, then a "+" chip for the rest. */
export function RankedChips({ options, majorId, trackId, selected, onToggle, label, initial = 8 }: {
  options: ChecklistOption[]; majorId?: string; trackId?: string; selected: string[]; onToggle: (id: string) => void; label: string; initial?: number;
}) {
  const ranked = rankOptions(options, majorId, trackId);
  const [expanded, setExpanded] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const shown = expanded ? ranked : ranked.filter((o, i) => i < initial || selected.includes(o.id));
  const hidden = ranked.filter((o) => !shown.includes(o));
  return (
    <ChipList label={label} chips={shown} selected={selected} onToggle={onToggle} focusId={focusId}
      more={hidden.length ? { count: hidden.length, label, onExpand: () => { setExpanded(true); setFocusId(hidden[0].id); } } : undefined} />
  );
}
