import { useMemo, useState } from "react";
import { ChipList } from "./ChipChecklist.tsx";
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

  const chips = (ids: string[], label: string) => (
    <ChipList label={`Options: ${label}`} chips={ids.map((id) => ({ id, label: experienceOption(id)?.label ?? id }))}
      selected={selected} onToggle={onToggle} focusId={focusId} />
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <label htmlFor="exp-search" className="sr-only">Search what you've done</label>
        <input id="exp-search" type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          placeholder="Search: intern, club, EMT…" aria-describedby="exp-search-count"
          className="min-h-12 w-full border-0 border-b-[1.5px] border-blue bg-sage px-0 text-body placeholder:text-blue" />
        <p id="exp-search-count" className="sr-only" aria-live="polite">{searching ? countText : ""}</p>
      </div>

      {searching ? (
        <section aria-labelledby="exp-results" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 id="exp-results" className="text-lead">{countText}</h2>
            <button type="button" onClick={() => setQ("")} className="btn btn--text">Clear search</button>
          </div>
          {results.length ? chips(results, "matches")
            : <p className="text-blue">Nothing matches that word. Clear the search to see everything.</p>}
        </section>
      ) : (
        <section aria-label="Options by group" className="flex flex-col gap-5">
          <div role="group" aria-label="Show" className="flex flex-wrap gap-1">
            {tabs.map((t) => {
              const n = t.ids.filter((id) => selected.includes(id)).length;
              const on = t.id === current.id;
              return (
                <button key={t.id} type="button" aria-pressed={on} onClick={() => { setTab(t.id); setFocusId(null); }}
                  className={`inline-flex min-h-12 items-center gap-2 border-[1.5px] px-3 whitespace-nowrap transition-colors duration-[140ms] ease-confluence
                    ${on ? "border-blue bg-blue text-sage" : "border-transparent bg-sage text-blue hover:border-blue"}`}>
                  {t.label}
                  {n > 0 && (
                    <>
                      <span aria-hidden="true" className="font-mono text-fact">{n}</span>
                      <span className="sr-only">, {n} picked</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-small">{current.hint}</p>
          {chips(shown, current.label)}
          {hidden.length > 0 && (
            <div>
              <button type="button" aria-expanded={otherOpen}
                onClick={() => {
                  setShowOther((s) => { const n = new Set(s); if (otherOpen) n.delete(current.id); else n.add(current.id); return n; });
                  setFocusId(otherOpen ? null : hidden[0]);
                }}
                className="btn btn--text">
                {otherOpen ? "Hide the less common ones" : `Show ${hidden.length} more, less common for ${major ?? "your major"}`}
              </button>
            </div>
          )}
        </section>
      )}

      {selected.length > 0 && (
        <section aria-labelledby="exp-picks" className="flex flex-col gap-2">
          <hr className="shore mb-4" />
          <h2 id="exp-picks" className="text-lead">Your picks ({selected.length})</h2>
          <ul aria-label="Your picks" className="border-t-[1.5px] border-blue">
            {selected.map((id) => {
              const label = experienceOption(id)?.label ?? id;
              return (
                <li key={id} className="flex min-h-12 items-center gap-3 border-b-[1.5px] border-blue py-1 pl-3">
                  <span className="flex-1 text-small">{label}</span>
                  <button type="button" aria-label={`Remove ${label}`} onClick={() => onToggle(id)} className="btn btn--text">Remove</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
