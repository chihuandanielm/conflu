import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { experienceGroups, experienceOption, experienceProfile, majorName, searchExperience, withFollowUps } from "../model.ts";

const SUGGESTED = "suggested";

/**
 * "What have you already done?": one open list of options at a time, switched by group buttons. It opens on
 * suggestions for the student's major; each group shows that major's options and tucks the rest behind a link;
 * follow-ups appear once their starting option is picked; search finds anything by everyday words. Picks from
 * anywhere collect in one removable list.
 */
export function ExperiencePicker({ majorId, selected, onToggle }: { majorId?: string; selected: string[]; onToggle: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState(SUGGESTED);
  const [showOther, setShowOther] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const profile = useMemo(() => experienceProfile(majorId), [majorId]);
  const major = majorName(majorId);

  const tabs = [
    { id: SUGGESTED, label: "Suggested", hint: major ? `What ${major} students most often have done by now.` : "What students most often have done by now.", ids: profile.suggested },
    ...experienceGroups.map((g) => ({ id: g.id, label: g.label, hint: g.hint, ids: g.options })),
  ];
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const isGroup = current.id !== SUGGESTED;
  const otherOpen = showOther.has(current.id);
  const hidden = isGroup ? withFollowUps(current.ids.filter((id) => profile.lessCommon.has(id) && !selected.includes(id)), []) : [];
  // The major's own options stay first; opening "less common" adds the rest after them.
  const common = isGroup ? current.ids.filter((id) => !hidden.includes(id)) : current.ids;
  const shown = withFollowUps(otherOpen ? [...common, ...hidden] : common, selected);

  const searching = q.trim().length > 0;
  const results = searchExperience(q).map((o) => o.id);
  const countText = results.length === 0 ? "No matches" : results.length === 1 ? "1 match" : `${results.length} matches`;

  useEffect(() => {
    if (focusId) listRef.current?.querySelector<HTMLButtonElement>(`[data-chip="${CSS.escape(focusId)}"]`)?.focus();
  }, [focusId]);

  const chips = (ids: string[], label: string) => (
    <ul ref={listRef} aria-label={`Options: ${label}`} className="flex flex-wrap gap-3">
      {ids.map((id) => {
        const on = selected.includes(id);
        return (
          <li key={id}>
            <button type="button" aria-pressed={on} data-chip={id} onClick={() => onToggle(id)}
              className={`inline-flex min-h-12 items-center gap-2.5 rounded-full border px-4 py-2 text-left text-base text-ink transition-colors duration-150 motion-reduce:transition-none
                ${on ? "border-green bg-green-tint" : "border-border-strong bg-bg hover:border-blue hover:bg-blue-tint"}`}>
              {on ? <Check size={18} strokeWidth={2.5} className="shrink-0 text-green" aria-hidden="true" />
                : <Plus size={18} strokeWidth={2.5} className="shrink-0 text-blue" aria-hidden="true" />}
              {experienceOption(id)?.label}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="relative">
        <label htmlFor="exp-search" className="sr-only">Search what you've done</label>
        <Search size={20} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input id="exp-search" type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          placeholder="Search: intern, club, EMT…" aria-describedby="exp-search-count"
          className="min-h-12 w-full rounded-full border border-border-strong bg-bg pr-4 pl-11 text-base placeholder:text-muted" />
        <p id="exp-search-count" className="sr-only" aria-live="polite">{searching ? countText : ""}</p>
      </div>

      {searching ? (
        <section aria-labelledby="exp-results" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 id="exp-results" className="text-lg font-semibold">{countText}</h2>
            <button type="button" onClick={() => setQ("")} className="min-h-11 px-1 text-blue underline underline-offset-2 hover:text-blue-hover">Clear search</button>
          </div>
          {results.length ? chips(results, "matches")
            : <p className="text-muted">Nothing matches that word. Clear the search to see everything.</p>}
        </section>
      ) : (
        <section aria-label="Options by group" className="flex flex-col gap-5">
          <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
            {tabs.map((t) => {
              const n = t.ids.filter((id) => selected.includes(id)).length;
              const on = t.id === current.id;
              return (
                <button key={t.id} type="button" aria-pressed={on} onClick={() => { setTab(t.id); setFocusId(null); }}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-2 text-[15px] font-semibold whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none
                    ${on ? "bg-ink text-bg" : "bg-surface text-ink hover:bg-blue-tint"}`}>
                  {t.label}
                  {n > 0 && (
                    <>
                      <span aria-hidden="true" className={`inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[13px] ${on ? "bg-bg text-ink" : "bg-green text-bg"}`}>{n}</span>
                      <span className="sr-only">, {n} picked</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[15px] text-muted">{current.hint}</p>
          {chips(shown, current.label)}
          {hidden.length > 0 && (
            <div>
              <button type="button" aria-expanded={otherOpen}
                onClick={() => {
                  setShowOther((s) => { const n = new Set(s); if (otherOpen) n.delete(current.id); else n.add(current.id); return n; });
                  setFocusId(otherOpen ? null : hidden[0]);
                }}
                className="min-h-11 px-1 text-[15px] text-blue underline underline-offset-2 hover:text-blue-hover">
                {otherOpen ? "Hide the less common ones" : `Show ${hidden.length} more, less common for ${major ?? "your major"}`}
              </button>
            </div>
          )}
        </section>
      )}

      {selected.length > 0 && (
        <section aria-labelledby="exp-picks" className="flex flex-col gap-2 border-t border-border pt-5">
          <h2 id="exp-picks" className="text-sm font-semibold">Your picks ({selected.length})</h2>
          <ul aria-label="Your picks" className="flex flex-wrap gap-2">
            {selected.map((id) => {
              const label = experienceOption(id)?.label ?? id;
              return (
                <li key={id} className="inline-flex items-center gap-0.5 rounded-full border border-green bg-green-tint py-0.5 pr-1 pl-3 text-sm">
                  {label}
                  <button type="button" aria-label={`Remove ${label}`} onClick={() => onToggle(id)}
                    className="inline-flex size-8 items-center justify-center rounded-full hover:bg-bg">
                    <X size={14} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
