import { useId, useMemo, useState } from "react";
import type { Answers } from "../intake/model.ts";
import { dueStatus, isTicked, loadTicks, progressFor, requirementsFor, toggleTick, type Due, type RequirementItem } from "./requirements.ts";

const DUE_LABEL: Record<Due, string> = {
  "done-by-now": "should be done by now", "this-year": "this year", later: "later", "any-time": "any time",
};

/** The student's year for requirements: a fifth-year (or later) answer counts as year 5, so every year through 4 is due. */
export const studentYearOf = (a: Pick<Answers, "year" | "yearTerm">) => (a.yearTerm === "5+" ? 5 : a.year ?? 1);

const checkedOn = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

const optionText = (o: { code: string; title: string; credits?: string }) =>
  `${o.code ? `${o.code} ` : ""}${o.title}${o.credits ? ` (${o.credits})` : ""}`;

/**
 * On track to graduate: the courses the student's major requires, grouped by typical year, from the official Rutgers
 * requirements for their campus (data/requirements.json), with a link to that page. Earlier years are marked "should be
 * done by now". Tick boxes are saved in this browser only. Outside the confluence map; it doesn't change the plan.
 */
export function OnTrack({ answers }: { answers: Answers }) {
  const r = requirementsFor(answers.majorId, answers.school);
  const [ticks, setTicks] = useState(loadTicks);
  const year = studentYearOf(answers);
  const groups = useMemo(() => {
    if (!r) return [];
    const years = [...new Set(r.items.map((i) => i.year))].sort((a, b) => (a ?? 99) - (b ?? 99));
    return years.map((y) => ({ year: y, items: r.items.filter((i) => i.year === y) }));
  }, [r]);
  const ids = useId();
  if (!r) return null;
  const p = progressFor(r, year, ticks);

  return (
    <section aria-labelledby="ontrack-h">
      <h2 id="ontrack-h" className="text-h2">On track to graduate</h2>
      <p className="fact mt-1.5">{r.degree.toLowerCase()}{r.credits?.major ? `  ${r.credits.major} credits in the major` : ""}{r.credits?.total ? `  ${r.credits.total} credits in all` : ""}</p>
      <p className="mt-2 max-w-[44em]">
        The courses your major requires, by the year students usually take them, from the {r.catalog}
        {" "}(last checked {checkedOn(r.checked)}). Tick what you've completed; your ticks stay in this browser.
      </p>
      <p className="mt-2 max-w-[44em]">
        You follow the catalog for the year you entered Rutgers (or entered your major or school). If you started before
        fall 2026, check your degree audit or the catalog for your year, and confirm with your adviser.
      </p>
      <p className="mt-2">
        <a href={r.pageUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          Official requirements for your major<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <span aria-hidden="true" className="ml-2 font-mono">-&gt;</span>
      </p>
      <p className="mt-3 max-w-[44em] text-small">
        {r.sequence === "official"
          ? "Years follow the school's published curriculum."
          : "The school doesn't publish a year-by-year plan for this major, so courses are grouped by level (100-level in year 1, 200 in year 2, and so on). Check the order with your adviser."}
      </p>
      <p className="mt-3 font-bold" aria-live="polite">
        {p.due > 0
          ? `${p.done} of ${p.due} requirements from earlier years ticked${p.done === p.due ? ": you're on track." : "."}`
          : "You're in your first year: start with the year 1 courses below."}
      </p>

      <div className="mt-4 border-t-[1.5px] border-blue">
        {groups.map((g) => {
          const due = dueStatus(g.year, year);
          const done = g.items.filter((i) => isTicked(ticks, r, i.id)).length;
          return (
            <details key={g.year ?? "any"} open={due === "done-by-now" || due === "this-year"} className="border-b-[1.5px] border-blue">
              <summary className="flex min-h-12 cursor-pointer flex-wrap items-baseline gap-x-3 py-3">
                <span className="text-lead">{g.year === null ? "Any time" : `Year ${g.year}`}</span>
                {g.year !== null && (
                  <span className={`fact px-1.5 ${due === "done-by-now" ? "bg-blue text-sage" : due === "this-year" ? "border-[1.5px] border-blue" : ""}`}>
                    {DUE_LABEL[due]}
                  </span>
                )}
                <span className="fact">{done} of {g.items.length} ticked</span>
              </summary>
              <ul className="pb-3">
                {g.items.map((i) => (
                  <Row key={i.id} item={i} id={`${ids}-${i.id}`} checked={isTicked(ticks, r, i.id)}
                    onToggle={() => setTicks((t) => toggleTick(t, r, i.id))} />
                ))}
              </ul>
            </details>
          );
        })}
      </div>

      {r.rules.length > 0 && (
        <>
          <h3 className="mt-6 text-lead">Rules to know</h3>
          <ul className="mt-2">
            {r.rules.map((x) => <li key={x} className="flex items-baseline gap-3 py-1"><span aria-hidden="true" className="dot translate-y-px" />{x}</li>)}
          </ul>
        </>
      )}
      {r.notes?.map((n) => <p key={n} className="mt-3 max-w-[44em] text-small">{n}</p>)}
    </section>
  );
}

function Row({ item, id, checked, onToggle }: { item: RequirementItem; id: string; checked: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-start gap-3 py-1.5">
      <input id={id} type="checkbox" className="tick" checked={checked} onChange={onToggle} />
      <label htmlFor={id} className="cursor-pointer">
        {item.kind === "course" ? (
          <>
            {item.label && <span className="block font-bold">{item.label}: one of</span>}
            {item.options.map((o, k) => (
              <span key={o.code + o.title} className="block">
                {k > 0 && <span className="fact mr-2">or</span>}{optionText(o)}
              </span>
            ))}
          </>
        ) : (
          <span className="block">{item.text}</span>
        )}
      </label>
    </li>
  );
}
