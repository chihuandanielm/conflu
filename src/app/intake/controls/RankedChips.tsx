import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { rankExperienceGroups, rankOptions, type ChecklistOption } from "../model.ts";
import { ChipList } from "./ChipChecklist.tsx";

const ShowMore = ({ onClick, count }: { onClick: () => void; count: number }) => (
  <button type="button" aria-expanded={false} onClick={onClick}
    className="inline-flex items-center gap-1 self-start rounded-md px-2 py-1 font-semibold text-blue hover:bg-blue-tint">
    Show more ({count}) <ChevronDown size={16} aria-hidden="true" />
  </button>
);

const PER_GROUP = 3;

/** Experience: grouped, the groups most relevant to the track and major first, the rest behind "Show more". */
export function ExperienceChips({ majorId, trackId, selected, onToggle }: {
  majorId?: string; trackId?: string; selected: string[]; onToggle: (id: string) => void;
}) {
  const groups = rankExperienceGroups(majorId, trackId);
  const [expanded, setExpanded] = useState(false);
  // Collapsed: each group's most relevant options (plus anything already picked), groups in relevance order.
  const shown = groups.map((g) => {
    const options = expanded ? g.options : g.options.filter((o, i) => (i < PER_GROUP && o.score > 0) || selected.includes(o.id));
    return { ...g, options };
  }).filter((g) => g.options.length);
  const hidden = groups.reduce((n, g) => n + g.options.length, 0) - shown.reduce((n, g) => n + g.options.length, 0);
  return (
    <div className="flex flex-col gap-6">
      {shown.map((g) => (
        <section key={g.id} aria-labelledby={`grp-${g.id}`}>
          <h2 id={`grp-${g.id}`} className="mb-2 text-sm font-semibold text-muted">{g.label}</h2>
          <ChipList label={g.label} chips={g.options} selected={selected} onToggle={onToggle} />
        </section>
      ))}
      {!expanded && hidden > 0 && <ShowMore count={hidden} onClick={() => setExpanded(true)} />}
    </div>
  );
}

/** Skills or certifications: one list, most relevant first, the first `initial` shown. */
export function RankedChips({ options, majorId, trackId, selected, onToggle, label, initial = 8 }: {
  options: ChecklistOption[]; majorId?: string; trackId?: string; selected: string[]; onToggle: (id: string) => void; label: string; initial?: number;
}) {
  const ranked = rankOptions(options, majorId, trackId);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? ranked : ranked.filter((o, i) => i < initial || selected.includes(o.id));
  return (
    <div className="flex flex-col gap-4">
      <ChipList label={label} chips={shown} selected={selected} onToggle={onToggle} />
      {!expanded && ranked.length > shown.length && <ShowMore count={ranked.length - shown.length} onClick={() => setExpanded(true)} />}
    </div>
  );
}
