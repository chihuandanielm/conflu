import { AlertTriangle, Info, X } from "lucide-react";

/** Real problems get amber; timeline information gets blue. */
export function noticeTone(w: string): "warn" | "info" {
  return /didn't fit|must-do|required for|window has passed|harder|hours a week would/i.test(w) ? "warn" : "info";
}

export function Notices({ warnings, dismissed, onDismiss }: { warnings: string[]; dismissed: string[]; onDismiss: (w: string) => void }) {
  const shown = warnings.filter((w) => !dismissed.includes(w))
    .sort((a, b) => (noticeTone(a) === "warn" ? 0 : 1) - (noticeTone(b) === "warn" ? 0 : 1));
  if (!shown.length) return null;
  return (
    <section aria-label="Notices" className="flex flex-col gap-2">
      {shown.map((w) => {
        const warn = noticeTone(w) === "warn";
        const Icon = warn ? AlertTriangle : Info;
        return (
          <div key={w} role={warn ? "alert" : "note"}
            className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${warn ? "border-amber/30 bg-amber-tint" : "border-blue/20 bg-blue-tint"}`}>
            <Icon size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${warn ? "text-amber" : "text-blue"}`} />
            <p className="flex-1 text-ink">{w}</p>
            <button type="button" onClick={() => onDismiss(w)} aria-label="Dismiss notice"
              className="-m-1 rounded-sm p-1 text-muted hover:bg-bg hover:text-ink">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </section>
  );
}
