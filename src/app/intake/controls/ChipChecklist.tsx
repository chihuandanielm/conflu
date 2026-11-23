import { useEffect, useRef } from "react";

export interface Chip { id: string; label: string }

/** A text button at the end of a list that reveals the rest of its options. */
export interface MoreChip { count: number; label: string; onExpand: () => void }

/** The open square of a many-choice row; ticked (drawn in lines, in the row's own ink) once picked. */
export function TickBox({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className="grid h-[18px] w-[18px] flex-none place-items-center border-[1.5px] border-current">
      {on && <span className="h-[5px] w-[9px] -translate-y-px -rotate-45 border-b-2 border-l-2 border-current" />}
    </span>
  );
}

/**
 * Many choices (design/DESIGN.md §7.2): the same ruled rows as a single choice, with an open square instead of a key
 * number; picked rows are solid blue with a tick. Used for experience, skills, certifications, and identity.
 * With `more`, the list ends in a "Show N more" text button; `focusId` moves focus to a row once it appears.
 */
export function ChipList({ chips, selected, onToggle, label, more, focusId }: {
  chips: Chip[]; selected: string[]; onToggle: (id: string) => void; label: string; more?: MoreChip; focusId?: string | null;
}) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (focusId) list.current?.querySelector<HTMLButtonElement>(`[data-chip="${CSS.escape(focusId)}"]`)?.focus();
  }, [focusId]);
  return (
    <div>
      <ul ref={list} aria-label={label} className="border-t-[1.5px] border-blue">
        {chips.map((c) => {
          const on = selected.includes(c.id);
          return (
            <li key={c.id}>
              <button type="button" aria-pressed={on} onClick={() => onToggle(c.id)} data-chip={c.id}
                className={`flex min-h-[54px] w-full items-center gap-3.5 border-b-[1.5px] border-blue px-3 py-2 text-left
                  transition-[background-color,color] duration-[140ms] ease-confluence hover:underline underline-offset-4
                  ${on ? "bg-blue text-sage" : "bg-sage text-blue"}`}>
                <TickBox on={on} />
                <span className="flex-1">{c.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {more && more.count > 0 && (
        <button type="button" aria-expanded={false} onClick={more.onExpand} className="btn btn--text mt-2"
          aria-label={`Show ${more.count} more ${more.label.toLowerCase()} options`}>
          Show {more.count} more
        </button>
      )}
    </div>
  );
}
