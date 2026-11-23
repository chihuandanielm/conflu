/** Real problems the student should act on soon (shown first). Queue and timeline notes are information. */
export function noticeTone(w: string): "warn" | "info" {
  return /required for|window has passed|harder/i.test(w) ? "warn" : "info";
}

/**
 * Good to know (design/DESIGN.md §7.4): quieter than the status strip, so a tip never looks as urgent as where the
 * student stands. Each notice is a paragraph with a 3px sand bar on its left, and "Dismiss".
 */
export function Notices({ warnings, dismissed, onDismiss }: { warnings: string[]; dismissed: string[]; onDismiss: (w: string) => void }) {
  const shown = warnings.filter((w) => !dismissed.includes(w))
    .sort((a, b) => (noticeTone(a) === "warn" ? 0 : 1) - (noticeTone(b) === "warn" ? 0 : 1));
  if (!shown.length) return null;
  return (
    <section aria-labelledby="notices-h" className="mt-7">
      <h3 id="notices-h" className="text-[1.25rem]">Good to know</h3>
      {shown.map((w) => {
        const warn = noticeTone(w) === "warn";
        return (
          <div key={w} role={warn ? "alert" : "note"} className="mt-3 max-w-[44em] border-l-[3px] border-sand py-0.5 pl-3.5">
            <p>{w}</p>
            <button type="button" onClick={() => onDismiss(w)} aria-label="Dismiss notice" className="btn btn--text -ml-2">Dismiss</button>
          </div>
        );
      })}
    </section>
  );
}
