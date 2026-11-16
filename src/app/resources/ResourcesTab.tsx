import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Plan, PlanInput } from "../../engine/types.ts";
import { campuses } from "../data/dataset.ts";
import { ResourceCard } from "./ResourceCard.tsx";
import { applyFilters, byGroup, GROUPS, noFilters, scopeLabel, tailoredResources, type ResourceFilters } from "./tailor.ts";

const PER_GROUP = 6;
const select = "min-h-10 rounded-md border border-border-strong bg-bg px-3 text-sm text-ink";

export function ResourcesTab({ plan, input }: { plan: Plan; input: PlanInput }) {
  const all = useMemo(() => tailoredResources(plan, input), [plan, input]);
  const [f, setF] = useState<ResourceFilters>(noFilters);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const shown = applyFilters(all, f);
  const groups = byGroup(shown);
  const scopes = [...new Set(all.map((t) => t.resource.scope))];
  const hasIdentity = (input.identity ?? []).length > 0;
  const ids = { type: useId(), scope: useId(), pay: useId(), you: useId() };

  return (
    <section aria-labelledby="res-h" className="flex flex-col gap-6">
      <div>
        <h2 id="res-h" className="text-xl font-semibold">Your resources</h2>
        <p className="mt-1 text-sm text-muted">
          Programs, organizations, and offices tied to your plan, plus everything for {input.year ? `year ${input.year} ` : ""}students in your major.
          {input.school === "other" ? " National and New Jersey options are listed first."
            : ` ${campuses.find((c) => c.school === (input.school ?? "rutgers-nb"))?.name ?? "Rutgers"} options are listed first.`}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-4 rounded-md border border-border bg-surface p-4" onSubmit={(e) => e.preventDefault()}>
        <label className="flex flex-col gap-1 text-sm" htmlFor={ids.type}>
          <span className="text-muted">Type</span>
          <select id={ids.type} className={select} value={f.group} onChange={(e) => setF({ ...f, group: e.target.value as ResourceFilters["group"] })}>
            <option value="all">All types</option>
            {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={ids.scope}>
          <span className="text-muted">Where</span>
          <select id={ids.scope} className={select} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
            <option value="all">Everywhere</option>
            {scopes.map((s) => <option key={s} value={s}>{scopeLabel(s)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={ids.pay}>
          <span className="text-muted">Pay</span>
          <select id={ids.pay} className={select} value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value as ResourceFilters["pay"] })}>
            <option value="all">Any</option>
            <option value="paid">Paid or funded</option>
            <option value="free">Free to use</option>
          </select>
        </label>
        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor={ids.you} className={`flex min-h-10 items-center gap-2 ${hasIdentity ? "text-ink" : "text-muted"}`}>
            <input id={ids.you} type="checkbox" className="h-4 w-4 accent-[var(--blue)]" disabled={!hasIdentity}
              checked={f.forYou} onChange={(e) => setF({ ...f, forYou: e.target.checked })} />
            For students like me
          </label>
        </div>
        {!hasIdentity && <p className="basis-full text-xs text-muted">“For students like me” uses the optional questions about you, which you skipped. Edit your answers to use it.</p>}
      </form>

      <p className="text-sm text-muted" aria-live="polite">Showing {shown.length} of {all.length} resources.</p>

      {groups.length === 0 ? (
        <p className="rounded-md border border-border p-6 text-muted">Nothing matches these filters. Try “Any” pay or “Everywhere”.</p>
      ) : groups.map((g) => {
        const expanded = open.has(g.id);
        const items = expanded ? g.items : g.items.slice(0, PER_GROUP);
        return (
          <section key={g.id} aria-labelledby={`rg-${g.id}`}>
            <h3 id={`rg-${g.id}`} className="text-lg font-semibold">{g.label} <span className="text-sm font-normal text-muted">{g.items.length}</span></h3>
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {items.map((t) => <ResourceCard key={t.resource.id} t={t} identity={input.identity ?? []} />)}
            </div>
            {g.items.length > PER_GROUP && !expanded && (
              <button type="button" aria-expanded={false} onClick={() => setOpen(new Set(open).add(g.id))}
                className="mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-blue hover:bg-blue-tint">
                Show all {g.items.length} <ChevronDown size={16} aria-hidden="true" />
              </button>
            )}
          </section>
        );
      })}
    </section>
  );
}
