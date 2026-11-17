import { useMemo, useState, type ReactNode } from "react";
import type { Plan, PlanInput } from "../../engine/types.ts";
import { campuses } from "../data/dataset.ts";
import { ResourceCard } from "./ResourceCard.tsx";
import { applyFilters, byGroup, GROUPS, noFilters, scopeLabel, tailoredResources, type ResourceFilters } from "./tailor.ts";

const PER_GROUP = 6;

/** A text toggle: plain blue text, solid blue while on (design/DESIGN.md §7.4b filters). */
function Toggle({ on, onClick, children, label, disabled }: { on: boolean; onClick: () => void; children: ReactNode; label?: string; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} disabled={disabled} onClick={onClick}
      className={`min-h-12 border-[1.5px] px-3 transition-colors duration-[140ms] ease-confluence disabled:cursor-not-allowed disabled:border-dashed disabled:border-blue
        ${on ? "border-blue bg-blue text-sage" : "border-transparent bg-sage text-blue hover:border-blue"}`}>
      {children}
    </button>
  );
}

/**
 * All resources (design/DESIGN.md §7.4b): filters as rows of text toggles with "Clear", then the boxes in a grid,
 * grouped by data/ui/resources.json, each group under a heading with its count and a shore above. The filter logic is
 * the existing one in tailor.ts.
 */
export function ResourcesTab({ plan, input }: { plan: Plan; input: PlanInput }) {
  const all = useMemo(() => tailoredResources(plan, input), [plan, input]);
  const [f, setF] = useState<ResourceFilters>(noFilters);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const shown = applyFilters(all, f);
  const groups = byGroup(shown);
  const scopes = [...new Set(all.map((t) => t.resource.scope))];
  const hasIdentity = (input.identity ?? []).length > 0;
  const filtered = f.group !== "all" || f.scope !== "all" || f.pay !== "all" || f.forYou;
  const row = (name: string, children: ReactNode) => (
    <div role="group" aria-label={name} className="flex items-start gap-2">
      <span className="fact w-14 flex-none pt-[15px]">{name.toLowerCase()}</span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );

  return (
    <section aria-labelledby="res-h" className="flex flex-col gap-6">
      <div>
        <h2 id="res-h" className="text-h2">All resources for your plan</h2>
        <p className="mt-2 max-w-[44em]">
          Programs, organizations, and offices tied to your plan, plus everything for {input.year ? `year ${input.year} ` : ""}students in your major.
          {input.school === "other" ? " National and New Jersey options are listed first."
            : ` ${campuses.find((c) => c.school === (input.school ?? "rutgers-nb"))?.name ?? "Rutgers"} options are listed first.`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {row("Type", <>
          <Toggle on={f.group === "all"} onClick={() => setF({ ...f, group: "all" })}>All types</Toggle>
          {GROUPS.filter((g) => all.some((t) => t.group === g.id)).map((g) => (
            <Toggle key={g.id} on={f.group === g.id} onClick={() => setF({ ...f, group: f.group === g.id ? "all" : g.id })}>{g.label}</Toggle>
          ))}
        </>)}
        {row("Where", <>
          <Toggle on={f.scope === "all"} onClick={() => setF({ ...f, scope: "all" })}>Everywhere</Toggle>
          {scopes.map((s) => <Toggle key={s} on={f.scope === s} onClick={() => setF({ ...f, scope: f.scope === s ? "all" : s })}>{scopeLabel(s)}</Toggle>)}
        </>)}
        {row("Pay", <>
          <Toggle on={f.pay === "all"} onClick={() => setF({ ...f, pay: "all" })}>Any</Toggle>
          <Toggle on={f.pay === "paid"} onClick={() => setF({ ...f, pay: f.pay === "paid" ? "all" : "paid" })}>Paid or funded</Toggle>
          <Toggle on={f.pay === "free"} onClick={() => setF({ ...f, pay: f.pay === "free" ? "all" : "free" })}>Free to use</Toggle>
        </>)}
        {row("You", <>
          <Toggle on={f.forYou} disabled={!hasIdentity} label="For students like me" onClick={() => setF({ ...f, forYou: !f.forYou })}>For students like me</Toggle>
          {filtered && <button type="button" className="btn btn--text ml-2" onClick={() => setF(noFilters)}>Clear</button>}
        </>)}
        {!hasIdentity && <p className="text-small">“For students like me” uses the optional questions about you, which you skipped. Edit your answers to use it.</p>}
      </div>

      <p className="fact" aria-live="polite">Showing {shown.length} of {all.length} resources.</p>

      {groups.length === 0 ? (
        <p className="notice">Nothing matches these filters. Try “Any” pay or “Everywhere”.</p>
      ) : groups.map((g) => {
        const expanded = open.has(g.id);
        const items = expanded ? g.items : g.items.slice(0, PER_GROUP);
        return (
          <section key={g.id} aria-labelledby={`rg-${g.id}`} className="flex flex-col gap-4">
            <hr className="shore" />
            <h2 id={`rg-${g.id}`} className="text-h2">{g.label} <span className="fact align-middle">{g.items.length}</span></h2>
            <ul className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
              {items.map((t) => <li key={t.resource.id}><ResourceCard t={t} identity={input.identity ?? []} /></li>)}
            </ul>
            {g.items.length > PER_GROUP && !expanded && (
              <button type="button" aria-expanded={false} onClick={() => setOpen(new Set(open).add(g.id))} className="btn btn--text self-start">
                Show all {g.items.length}
              </button>
            )}
          </section>
        );
      })}
    </section>
  );
}
