import { useState } from "react";
import { rankOptions, type ChecklistOption } from "../model.ts";
import { ChipList } from "./ChipChecklist.tsx";

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
