import { useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { LEGAL } from "../../engine/engine.ts";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import type { Resource } from "../../types.ts";
import { resourceById } from "../data/resources.ts";
import { factLine } from "../map/facts.ts";
import { ResourceCard } from "../resources/ResourceCard.tsx";
import { groupOf, type Tailored } from "../resources/tailor.ts";
import { howTo, type StepProgress } from "../state/steps.ts";
import { Button } from "../ui/Button.tsx";
import { PriorityTag } from "./GoalRow.tsx";
import { useMediaQuery } from "./useMediaQuery.ts";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
/** Words in a step that mean "your career office": they link to the career office among the goal's places. */
const CAREER_OFFICE = /\b(?:your |the )?(?:campus )?career (?:center|centre|office|services)\b/i;

/**
 * A step with the place it names linked: a place whose name appears in the step, or "your career center" when one of
 * the goal's places is a career office. The step stays plain text when it names no place.
 */
export function linkStep(step: string, places: Resource[]): ReactNode {
  const named = places.map((r) => ({ r, at: step.toLowerCase().indexOf(r.name.toLowerCase()), len: r.name.length })).find((x) => x.at >= 0);
  const career = !named && places.find((r) => /career/i.test(r.name) && r.type === "campus_office");
  const m = career ? CAREER_OFFICE.exec(step) : null;
  const hit = named ?? (career && m ? { r: career, at: m.index, len: m[0].length } : null);
  if (!hit) return step;
  return (
    <>
      {step.slice(0, hit.at)}
      <a href={hit.r.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
        {step.slice(hit.at, hit.at + hit.len)}<span className="sr-only"> ({hit.r.name}, opens in a new tab)</span>
      </a>
      {step.slice(hit.at + hit.len)}
    </>
  );
}

/**
 * The goal drawer (design/DESIGN.md §7.4): a side sheet on the right (480px, a 1.5px blue left edge) on wide screens,
 * a bottom sheet under 600px. No dimming (there is no fifth colour to dim with); the page behind is inert. Inside:
 * Close, the fact line, the title, then one scroll: What to do (tick boxes, with the places they name linked), Where to
 * go (resource boxes) right under it, Done when, Why it's here, and "Mark as done". It slides in over 260ms. Traps
 * focus; Escape closes.
 */
export function GoalDrawer({ item, term, identity, onClose, onDone, onSkip, progress = {}, onToggleStep = () => {}, weeks }: {
  item: PlanItem; term: PlanTerm; identity: string[]; onClose: () => void; onDone: (goalId: string) => void;
  /** "Not for me" (engine 0.9.0): cross the goal out and re-plan without it. */
  onSkip?: (goalId: string) => void;
  progress?: StepProgress; onToggleStep?: (goalId: string, i: number) => void;
  /** Weeks of work left in the goal's term, for "~N h a week". */
  weeks?: number;
}) {
  const wide = useMediaQuery("(min-width: 600px)");
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const els = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [onClose]);

  const how = howTo(item);
  const checked = progress[item.goalId] ?? [];
  const doneCount = how.steps.filter((_, i) => checked.includes(i)).length;
  const allChecked = how.steps.length > 0 && doneCount === how.steps.length;
  // Where to go: the goal's resources, then its how-to guides, as the same boxes as the Resources tab.
  const boxes: Tailored[] = [...new Map([...item.resources.map((r) => resourceById.get(r.id)), ...how.guides]
    .filter((r): r is Resource => !!r).map((r) => [r.id, r])).values()]
    .map((r) => ({ resource: r, group: groupOf(r), forYou: r.identity.some((x) => !LEGAL.has(x) && identity.includes(x)), goalIds: [], goals: [], score: 0 }));
  const places = boxes.map((b) => b.resource);

  const todo: ReactNode = (
    <>
      {how.steps.length > 0 && (
        <section aria-labelledby="todo-h" className="mt-6">
          <div className="flex items-baseline justify-between gap-2 border-t-[3px] border-blue pt-2">
            <h3 id="todo-h" className="text-[1.3125rem]">What to do</h3>
            <p className="fact" aria-live="polite">{doneCount} of {how.steps.length} done</p>
          </div>
          {/* Progress: a green fill for what's done (design/DESIGN.md §2: green is done). */}
          <div aria-hidden="true" className="mt-2 h-2 border-[1.5px] border-blue">
            <div aria-hidden="true" className="h-full bg-green transition-[width] duration-[260ms]" style={{ width: `${(doneCount / how.steps.length) * 100}%` }} />
          </div>
          <ol className="mt-2">
            {how.steps.map((step, i) => {
              const id = `step-${item.goalId}-${i}`;
              const on = checked.includes(i);
              return (
                <li key={id} className="grid grid-cols-[22px_1.25rem_1fr] items-start gap-2.5 border-b-[1.5px] border-blue py-2.5">
                  <input id={id} type="checkbox" className="tick" checked={on} onChange={() => onToggleStep(item.goalId, i)} />
                  <span aria-hidden="true" className="fact text-blue">{i + 1}</span>
                  <label htmlFor={id} className={`cursor-pointer ${on ? "line-through decoration-green decoration-2" : ""}`}><span className="sr-only">Step {i + 1}: </span>{linkStep(step, places)}</label>
                </li>
              );
            })}
          </ol>
          {allChecked && <p className="mt-2 text-small">Every step is checked. Mark it as done below to update your plan.</p>}
        </section>
      )}
      {how.doneWhen && (
        <section aria-labelledby="donewhen-h" className="mt-5 border-l-[3px] border-green pl-3">
          <h3 id="donewhen-h" className="text-[1.125rem] text-ink">Done when</h3>
          <p className="text-small">{how.doneWhen}</p>
        </section>
      )}
    </>
  );
  const more: ReactNode = (
    <>
      <section aria-labelledby="why-h" className="mt-6">
        <h3 id="why-h" className="text-[1.25rem]">Why it's here</h3>
        <ul className="mt-1.5">{item.why.map((w) => <li key={w} className="py-1.5">{w}</li>)}</ul>
      </section>
    </>
  );
  const go: ReactNode = (
    <section aria-labelledby="go-h" className="mt-7">
      <div className="flex items-baseline justify-between gap-2 border-t-[3px] border-blue pt-2">
        <h3 id="go-h" className="text-[1.3125rem]">Where to go</h3>
        {boxes.length > 0 && <p className="fact">{boxes.length} {boxes.length === 1 ? "place" : "places"}</p>}
      </div>
      {boxes.length === 0 ? (
        <p className="mt-1.5">No linked programs fit your year and major for this step yet. Your career office can point you to options.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">{boxes.map((t) => <li key={t.resource.id}><ResourceCard inDrawer t={t} identity={identity} /></li>)}</ul>
      )}
    </section>
  );

  const hidden = wide ? { x: "100%" } : { y: "100%" };
  const t = { duration: reduce ? 0 : 0.26, ease: [0.22, 0.61, 0.36, 1] as const };
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-transparent" onClick={onClose} aria-hidden="true" />
      <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby="drawer-title"
        initial={reduce ? false : hidden} animate={{ x: 0, y: 0 }} exit={reduce ? { opacity: 0 } : hidden} transition={t}
        className="absolute inset-x-0 top-[12dvh] bottom-0 overflow-y-auto border-t-[1.5px] border-blue bg-sage px-[clamp(16px,4vw,28px)] pt-[22px] pb-7
          min-[600px]:top-0 min-[600px]:right-0 min-[600px]:left-auto min-[600px]:w-[480px] min-[600px]:border-t-0 min-[600px]:border-l-[1.5px]">
        <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close details" className="btn btn--small sticky top-0 float-right ml-3">Close</button>
        <p className="fact">{term.label.toLowerCase()}</p>
        <h2 id="drawer-title" className="mt-1.5 text-[1.75rem] leading-[1.1]">{item.title}</h2>
        <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <PriorityTag it={item} />
          <span className="fact">{item.option ? "an extra option on your draft map" : factLine({ ...item, gate: false }, term.code, weeks)}</span>
        </p>
        {todo}{go}{more}
        <p className="mt-[26px] flex flex-wrap gap-2">
          <Button onClick={() => onDone(item.goalId)}>Mark as done</Button>
          {onSkip && <Button variant="outline" onClick={() => onSkip(item.goalId)}><span aria-hidden="true" className="mr-1.5 font-mono">x</span>Not for me</Button>}
        </p>
      </motion.div>
    </div>
  );
}
