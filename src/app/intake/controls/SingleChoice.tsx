import { useEffect } from "react";
import { Check } from "lucide-react";

export interface Choice<V> { value: V; label: string; description?: string; disabled?: boolean; note?: string; section?: string }

/**
 * One answer from a list, as a radio group of large buttons.
 * Number keys 1–9 pick the matching enabled option (ignored while typing in a text field).
 */
export function SingleChoice<V extends string | number>({ choices, value, onSelect, labelledBy, numberKeys = true }: {
  choices: Choice<V>[]; value: V | undefined; onSelect: (v: V) => void; labelledBy: string; numberKeys?: boolean;
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
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-col gap-2">
      {choices.map((c, i) => {
        const selected = c.value === value;
        const showSection = c.section && c.section !== choices[i - 1]?.section;
        return (
          <div key={String(c.value)} className="contents">
            {showSection && <p className="mt-4 text-sm font-semibold text-muted first:mt-0">{c.section}</p>}
            <button
              type="button" role="radio" aria-checked={selected} disabled={c.disabled}
              onClick={() => onSelect(c.value)}
              className={`group flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors duration-150
                ${selected ? "border-blue bg-blue-tint" : "border-border bg-bg hover:border-border-strong hover:bg-surface"}
                disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:hover:bg-surface`}
            >
              {numberKeys && i < 9 && (
                <span aria-hidden="true" className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border font-mono text-xs
                  ${selected ? "border-blue bg-blue text-white" : "border-border-strong text-muted"}`}>
                  {selected ? <Check size={14} strokeWidth={2.5} /> : i + 1}
                </span>
              )}
              <span className="flex-1">
                <span className={`block font-semibold ${c.disabled ? "text-muted" : "text-ink"}`}>{c.label}</span>
                {c.description && <span className="mt-1 block text-sm text-muted">{c.description}</span>}
              </span>
              {c.note && <span className="mt-0.5 shrink-0 rounded-sm bg-surface px-2 py-0.5 text-xs text-ink">{c.note}</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
