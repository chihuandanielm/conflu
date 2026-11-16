import { useEffect, useRef } from "react";
import { Check, Plus } from "lucide-react";

export interface Chip { id: string; label: string }

/** A "+" chip at the end of a list that reveals the rest of its options. */
export interface MoreChip { count: number; label: string; onExpand: () => void }

/**
 * Selectable chips (toggle buttons). Used for experience, skills, certifications, and identity.
 * With `more`, the list ends in a "+" chip; `focusId` moves focus to a chip once it appears (the first one revealed).
 */
export function ChipList({ chips, selected, onToggle, label, more, focusId }: {
  chips: Chip[]; selected: string[]; onToggle: (id: string) => void; label: string; more?: MoreChip; focusId?: string | null;
}) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (focusId) list.current?.querySelector<HTMLButtonElement>(`[data-chip="${CSS.escape(focusId)}"]`)?.focus();
  }, [focusId]);
  return (
    <ul ref={list} aria-label={label} className="flex flex-wrap gap-2">
      {chips.map((c) => {
        const on = selected.includes(c.id);
        return (
          <li key={c.id}>
            <button type="button" aria-pressed={on} onClick={() => onToggle(c.id)} data-chip={c.id}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 py-1.5 text-left text-sm transition-colors duration-150
                ${on ? "border-green bg-green-tint text-ink" : "border-border bg-bg text-ink hover:border-border-strong hover:bg-surface"}`}>
              {on && <Check size={14} strokeWidth={2.5} className="text-green" aria-hidden="true" />}
              {c.label}
            </button>
          </li>
        );
      })}
      {more && more.count > 0 && (
        <li>
          <button type="button" aria-expanded={false} onClick={more.onExpand}
            aria-label={`Show ${more.count} more ${more.label.toLowerCase()} options`} title={`${more.count} more`}
            className="inline-flex min-h-10 items-center gap-1 rounded-md border border-dashed border-border-strong bg-bg px-3 py-1.5 text-sm font-semibold text-blue transition-colors duration-150 hover:border-blue hover:bg-blue-tint">
            <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
            <span aria-hidden="true">{more.count}</span>
          </button>
        </li>
      )}
    </ul>
  );
}
