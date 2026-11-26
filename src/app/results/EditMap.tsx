import { useEffect, useRef } from "react";
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { tracks } from "../data/dataset.ts";
import { factLine } from "../map/facts.ts";
import { Button } from "../ui/Button.tsx";

/** Importance, most first (engine 0.9.0: from the career path's recruiter-backed weights). */
export const IMPORTANCE: Record<PlanItem["importance"], { rank: number; label: string }> = {
  must: { rank: 0, label: "Essential must-do" },
  high: { rank: 1, label: "High priority" },
  medium: { rank: 2, label: "Worth doing" },
  low: { rank: 3, label: "If you have time" },
};

/** A term's goals, most important first, then by score. */
export const byImportance = (items: PlanItem[]) =>
  [...items].sort((a, b) => IMPORTANCE[a.importance].rank - IMPORTANCE[b.importance].rank || b.score.total - a.score.total || a.goalId.localeCompare(b.goalId));

/** The plan without the draft's extra options: what the student's own time fits. */
export function withoutOptions(plan: Plan): Plan {
  return { ...plan, terms: plan.terms.map((t) => ({ ...t, items: t.items.filter((i) => !i.option) })) };
}

const optionCount = (plan: Plan) => plan.terms.reduce((n, t) => n + t.items.filter((i) => i.option).length, 0);

/**
 * On the Plan tab, the draft is one dashed line (design/DESIGN.md §7.4 #5): what it is and a link to the Map tab, where
 * the full banner and its "Finalize my map" button live. One solid blue block per screen stays "Do this now".
 */
export function DraftLine({ plan, finalized, weeklyHours, onEdit }: { plan: Plan; finalized: boolean; weeklyHours?: number; onEdit: () => void }) {
  const extra = optionCount(plan);
  return (
    <section aria-labelledby="draftline-h" className="flex flex-wrap items-center justify-between gap-3 border-[1.5px] border-dashed border-blue px-3.5 py-3">
      <div>
        <h2 id="draftline-h" className="text-[1.1875rem]">{finalized ? "Your final map" : "This is a draft map"}</h2>
        <p className="text-small">{finalized ? `Sized to ${weeklyHours ? `your ${weeklyHours} free hours a week` : "your time"}.` : `${extra} extra ${extra === 1 ? "option" : "options"} to review.`}</p>
      </div>
      <button type="button" className="btn btn--text" onClick={onEdit}>{finalized ? "Edit it on the Map tab" : "Review on the Map tab"}<span aria-hidden="true" className="font-mono">-&gt;</span></button>
    </section>
  );
}

/**
 * The draft banner (engine 0.9.0): says the map can be edited, and how. A new plan is a draft with more options than the
 * student's time fits; they cross out what's not for them, mark done what they've done, and finalize. Or they keep the
 * draft as it is (it downloads as a PDF too). A final map can go back to the draft.
 */
export function DraftBanner({ plan, finalized, weeklyHours, onFinalize, onReopen, onEdit }: {
  plan: Plan; finalized: boolean; weeklyHours?: number; onFinalize: () => void; onReopen: () => void; onEdit?: () => void;
}) {
  const hours = weeklyHours ? `your ${weeklyHours} free hours a week` : "the time you have";
  const extra = optionCount(plan);
  return (
    <section aria-labelledby="draft-h" className="border-l-[3px] border-blue pl-4">
      <h2 id="draft-h" className="text-[1.375rem]">{finalized ? "Your final map" : "This is your draft map"}</h2>
      {finalized ? (
        <p className="mt-1.5 max-w-[44em]">Sized to {hours}. You can still cross out goals that aren't for you, mark goals done, or go back to the draft to see more options.</p>
      ) : (
        <p className="mt-1.5 max-w-[44em]">
          It shows {extra} more {extra === 1 ? "option" : "options"} than {hours} fit, most important first. Cross out what isn't for
          you and mark done what you've already done. When it looks right, finalize it to get a plan sized to your time. Or keep the
          draft as it is: it downloads as a PDF too.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {onEdit && <Button variant="outline" small onClick={onEdit}>Edit your map</Button>}
        {finalized
          ? <Button variant="text" small onClick={onReopen}>Back to the draft</Button>
          : <Button small onClick={onFinalize}>Finalize my map</Button>}
      </div>
    </section>
  );
}

/**
 * Edit your map (engine 0.9.0): every semester's goals, most important first, each with "Mark as done" and "Not for me".
 * Must-dos are marked "Essential must-do"; crossing one out is allowed (the plan warns). Crossed-out goals are listed
 * at the end with Undo.
 */
export function EditMap({ plan, trackId, onOpen, onDone, onSkip, onUndoSkip, arrive = false, onArrived }: {
  plan: Plan; trackId?: string; onOpen: (it: PlanItem, t: PlanTerm) => void;
  onDone: (goalId: string) => void; onSkip: (goalId: string) => void; onUndoSkip: (goalId: string) => void;
  /** Came here from "Edit your map": scroll to this section and focus its heading once it's on the page. */
  arrive?: boolean; onArrived?: () => void;
}) {
  const track = tracks.find((t) => t.id === trackId);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!arrive) return;
    // After the tab switch has settled (it returns the window to the top of the panel first).
    const t = window.setTimeout(() => {
      heading.current?.scrollIntoView({ block: "start" });
      heading.current?.focus({ preventScroll: true });
      onArrived?.();
    }, 80);
    return () => window.clearTimeout(t);
  }, [arrive, onArrived]);
  return (
    <section aria-labelledby="edit-h" id="edit-map">
      <h2 ref={heading} id="edit-h" tabIndex={-1} className="scroll-mt-16 text-h2">Edit your map</h2>
      <p className="mt-2 max-w-[44em]">
        Each semester lists the most important goals first{track ? `, ranked by what ${track.name.toLowerCase()} recruiters look for` : ""}.
        {" "}The reasons and their sources are under "Why this order" on the Plan tab.
      </p>
      {plan.terms.filter((t) => t.items.length).map((t) => (
        <section key={t.code} aria-labelledby={`edit-${t.code}`} className="mt-8">
          <h3 id={`edit-${t.code}`} className="text-[1.25rem]">{t.label}</h3>
          <ul className="mt-2 border-t-[1.5px] border-blue">
            {byImportance(t.items).map((it) => <EditRow key={it.goalId} it={it} term={t.code} onOpen={() => onOpen(it, t)} onDone={onDone} onSkip={onSkip} />)}
          </ul>
        </section>
      ))}
      {plan.skipped.length > 0 && <NotForMe plan={plan} onUndo={onUndoSkip} className="mt-10" />}
    </section>
  );
}

function EditRow({ it, term, onOpen, onDone, onSkip }: { it: PlanItem; term: string; onOpen: () => void; onDone: (id: string) => void; onSkip: (id: string) => void }) {
  const must = it.importance === "must";
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b-[1.5px] border-blue py-3 pr-1 ${must ? "border-l-[3px] pl-3" : "pl-1"}`}>
      <span aria-hidden="true" className={`dot ${must ? "dot--must" : ""}`} />
      <div className="min-w-[12em] flex-1">
        <button type="button" onClick={onOpen} className="title relative text-left text-[1.1875rem] leading-[1.2] text-blue underline-offset-4 after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-[''] hover:underline">{it.title}</button>
        <span className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`fact px-1.5 ${must ? "bg-blue text-sage" : "border-[1.5px] border-blue"}`}>{IMPORTANCE[it.importance].label}</span>
          <span className="fact">{it.option ? `${factLine({ ...it, gate: false })} · option` : factLine({ ...it, gate: false }, term)}</span>
        </span>
      </div>
      <span className="flex gap-2">
        <button type="button" className="btn btn--small" aria-label={`Mark as done: ${it.title}`} onClick={() => onDone(it.goalId)}>Mark as done</button>
        <button type="button" className="btn btn--small" aria-label={`Not for me: ${it.title}`} onClick={() => onSkip(it.goalId)}>
          <span aria-hidden="true" className="mr-1.5 font-mono">x</span>Not for me
        </button>
      </span>
    </li>
  );
}

/** Crossed-out goals, with Undo. A crossed-out must-do stays marked as one. */
export function NotForMe({ plan, onUndo, className = "" }: { plan: Plan; onUndo: (goalId: string) => void; className?: string }) {
  return (
    <section aria-labelledby="skipped-h" className={className}>
      <h2 id="skipped-h" className="text-h2">Not for me</h2>
      <ul className="mt-3">
        {plan.skipped.map((s) => (
          <li key={s.goalId} className="flex flex-wrap items-baseline gap-3 py-[7px]">
            <span aria-hidden="true" className={`dot translate-y-px ${s.essential ? "dot--must" : ""}`} />
            <span className="flex-1">
              <span className="line-through decoration-[1.5px]">{s.title}</span>
              {s.essential && <span className="fact ml-2 bg-blue px-1.5 text-sage">Essential must-do</span>}
            </span>
            <button type="button" className="btn btn--text" aria-label={`Undo: ${s.title}`} onClick={() => onUndo(s.goalId)}>Undo</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
