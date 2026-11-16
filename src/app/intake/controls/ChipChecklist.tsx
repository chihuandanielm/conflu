import { Check } from "lucide-react";

export interface Chip { id: string; label: string }

/** Selectable chips (toggle buttons). Used for experience, skills, certifications, and identity. */
export function ChipList({ chips, selected, onToggle, label }: {
  chips: Chip[]; selected: string[]; onToggle: (id: string) => void; label: string;
}) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {chips.map((c) => {
        const on = selected.includes(c.id);
        return (
          <li key={c.id}>
            <button type="button" aria-pressed={on} onClick={() => onToggle(c.id)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 py-1.5 text-left text-sm transition-colors duration-150
                ${on ? "border-green bg-green-tint text-ink" : "border-border bg-bg text-ink hover:border-border-strong hover:bg-surface"}`}>
              {on && <Check size={14} strokeWidth={2.5} className="text-green" aria-hidden="true" />}
              {c.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
