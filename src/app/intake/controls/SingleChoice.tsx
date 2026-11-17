import { useEffect } from "react";
import { Check } from "lucide-react";

export interface Choice<V> { value: V; label: string; description?: string; disabled?: boolean; note?: string; section?: string }

/**
 * One answer from a list, as a radio group of large buttons.
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
    <div role="radiogroup" aria-labelledby={labelledBy} aria-invalid={invalid || undefined} aria-describedby={describedBy} className="flex flex-col gap-2">
      {choices.map((c, i) => {
        const selected = c.value === value;
        const showSection = c.section && c.section !== choices[i - 1]?.section;
        return (
          <div key={String(c.value)} className="contents">
            {showSection && <p className="mt-4 text-small text-blue first:mt-0">{c.section}</p>}
            <button
              type="button" role="radio" aria-checked={selected} disabled={c.disabled}
              onClick={() => onSelect(c.value)}
              className={`group flex w-full items-start gap-3 border px-4 py-3 text-left transition-colors duration-150
                ${selected ? "border-blue bg-blue text-sage" : "border-blue bg-sage text-blue"}
                disabled:cursor-not-allowed disabled:border-blue disabled:bg-sage disabled:hover:bg-sage`}
            >
              {numberKeys && i < 9 && (
                <span aria-hidden="true" className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-fact
                  ${selected ? "border-sage" : "border-blue"}`}>
                  {selected ? <Check size={14} strokeWidth={2.5} /> : i + 1}
                </span>
              )}
              <span className="flex-1">
                <span className="block">{c.label}</span>
                {c.description && <span className="mt-1 block text-small">{c.description}</span>}
              </span>
              {c.note && <span className="mt-0.5 shrink-0 px-2 py-0.5 font-mono text-fact">{c.note}</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
