import { useEffect } from "react";

export interface Choice<V> { value: V; label: string; description?: string; disabled?: boolean; note?: string; section?: string }

/**
 * One answer from a list (design/DESIGN.md §7.2): ruled rows, 54px tall, a mono key number in a small square, the label
 * and an optional second line. Hover indents the row 8px; selected is solid blue.
 * Number keys 1–9 pick the matching enabled option (ignored while typing in a text field).
 */
export function SingleChoice<V extends string | number>({ choices, value, onSelect, labelledBy, numberKeys = true, invalid, describedBy }: {
  choices: Choice<V>[]; value: V | undefined; onSelect: (v: V) => void; labelledBy: string; numberKeys?: boolean;
  /** Marks a required answer that's still missing; `describedBy` points at the message that says so. */
  invalid?: boolean; describedBy?: string;
}) {
  useEffect(() => {
    if (!numberKeys) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const c = choices[n - 1];
      if (c && !c.disabled) { e.preventDefault(); onSelect(c.value); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choices, onSelect, numberKeys]);

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-invalid={invalid || undefined} aria-describedby={describedBy}
      className="border-t-[1.5px] border-blue">
      {choices.map((c, i) => {
        const selected = c.value === value;
        const showSection = c.section && c.section !== choices[i - 1]?.section;
        return (
          <div key={String(c.value)} className="contents">
            {showSection && <p className={`text-small ${i === 0 ? "pt-2" : "border-t-[1.5px] border-blue pt-5"} pb-2`}>{c.section}</p>}
            <button
              type="button" role="radio" aria-checked={selected} disabled={c.disabled}
              onClick={() => onSelect(c.value)}
              className={`flex min-h-[54px] w-full items-center gap-3.5 border-b-[1.5px] border-blue px-3 py-2 text-left
                transition-[background-color,color,padding] duration-[140ms] ease-confluence
                ${selected ? "border-violet bg-violet text-sage" : "bg-sage text-blue"} ${c.disabled ? "cursor-not-allowed border-dashed" : "hover:underline underline-offset-4"}`}
            >
              {numberKeys && i < 9 && (
                <kbd aria-hidden="true" className="grid h-6 w-6 flex-none place-items-center border-[1.5px] border-current font-mono text-fact">{i + 1}</kbd>
              )}
              <span className="flex-1">
                <span className="block">{c.label}</span>
                {c.description && <span className="block text-small">{c.description}</span>}
                {c.note && <span className="block text-small">{c.note}</span>}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
