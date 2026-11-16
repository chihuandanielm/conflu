import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, BookOpen, Check, X } from "lucide-react";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import { lastChecked, needsEligibilityCheck, resourceById } from "../data/resources.ts";
import { howTo, type StepProgress } from "../state/steps.ts";
import { Button } from "../ui/Button.tsx";
import { LANE_LABEL } from "./lanes.ts";
import { Tag } from "./Tag.tsx";
import { useMediaQuery } from "./useMediaQuery.ts";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Goal details: right-side drawer on desktop, bottom sheet on phones. Traps focus; Escape closes. */
export function GoalDrawer({ item, term, identity, onClose, onDone, progress = {}, onToggleStep = () => {} }: {
  item: PlanItem; term: PlanTerm; identity: string[]; onClose: () => void; onDone: (goalId: string) => void;
  progress?: StepProgress; onToggleStep?: (goalId: string, i: number) => void;
}) {
  const desktop = useMediaQuery("(min-width: 768px)");
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

  const hidden = desktop ? { x: "100%" } : { y: "100%" };
  const t = { duration: reduce ? 0.01 : 0.22, ease: "easeOut" as const };
  const resources = item.resources.map((r) => ({ ...r, full: resourceById.get(r.id) }));
  const how = howTo(item);
  const checked = progress[item.goalId] ?? [];
  const doneCount = how.steps.filter((_, i) => checked.includes(i)).length;
  const allChecked = how.steps.length > 0 && doneCount === how.steps.length;

  return (
    <div className="fixed inset-0 z-50">
      <motion.div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden="true"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t} />
      <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby="drawer-title"
        initial={reduce ? { opacity: 0 } : hidden} animate={reduce ? { opacity: 1 } : { x: 0, y: 0 }} exit={reduce ? { opacity: 0 } : hidden} transition={t}
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-lg border-t border-border bg-bg
          md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[440px] md:rounded-none md:border-t-0 md:border-l">
        <div className="flex items-start gap-3 border-b border-border px-6 pt-5 pb-4">
          <div className="flex-1">
            <p className="text-xs text-muted">{LANE_LABEL[item.lane]} · {term.label}</p>
            <h2 id="drawer-title" className="mt-1 text-xl font-semibold">{item.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted">{item.hours} h this term</span>
              {item.gate && <Tag tone="gate">Must-do</Tag>}
              {item.partial && <Tag tone="partial">Continues next term</Tag>}
            </div>
          </div>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close details"
            className="-m-1 rounded-sm p-1 text-muted hover:bg-surface hover:text-ink"><X size={20} aria-hidden="true" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {how.steps.length > 0 && (
            <section aria-labelledby="todo-h" className="mb-6">
              <div className="flex items-baseline justify-between gap-2">
                <h3 id="todo-h" className="text-sm font-semibold text-muted">What to do</h3>
                <p className="font-mono text-xs text-muted" aria-live="polite">{doneCount} of {how.steps.length} done</p>
              </div>
              <ol className="mt-2 flex flex-col gap-1">
                {how.steps.map((step, i) => {
                  const id = `step-${item.goalId}-${i}`;
                  const on = checked.includes(i);
                  return (
                    <li key={id}>
                      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-surface">
                        <input id={id} type="checkbox" checked={on} onChange={() => onToggleStep(item.goalId, i)}
                          className="mt-0.5 size-5 shrink-0 accent-green" />
                        <span className={`text-sm ${on ? "text-muted line-through" : "text-ink"}`}>
                          <span className="sr-only">Step {i + 1}: </span>{step}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ol>
              {how.doneWhen && (
                <p className="mt-3 rounded-md bg-green-tint px-3 py-2 text-sm text-ink"><span className="font-semibold">Done when: </span>{how.doneWhen}</p>
              )}
              {allChecked && <p className="mt-2 text-sm text-green">Every step is checked. Mark it as done below to update your plan.</p>}
            </section>
          )}

          <h3 className="text-sm font-semibold text-muted">Why it's in your plan</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {item.why.map((w) => (
              <li key={w} className="flex gap-2 text-sm"><span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />{w}</li>
            ))}
          </ul>

          <h3 className="mt-6 text-sm font-semibold text-muted">Where to start</h3>
          {resources.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No linked programs fit your year and major for this step yet. Your career office can point you to options.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-4">
              {resources.map((r) => {
                const checked = r.full ? lastChecked(r.full) : null;
                const check = r.full ? needsEligibilityCheck(r.full, identity) : false;
                return (
                  <li key={r.id} className="rounded-md border border-border p-3">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 font-semibold text-blue underline-offset-2 hover:underline">
                      {r.name}<ArrowUpRight size={14} aria-hidden="true" className="mt-1 shrink-0" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    {r.full?.summary && <p className="mt-1 text-sm text-ink">{r.full.summary}</p>}
                    {r.note && <p className="mt-1 text-sm text-amber">{r.note}</p>}
                    {check && <p className="mt-1 text-sm text-muted">For specific groups of students. Check eligibility.</p>}
                    {checked && <p className="mt-1 text-xs text-muted">Link last checked {checked}</p>}
                  </li>
                );
              })}
            </ul>
          )}

          {how.guides.length > 0 && (
            <section aria-labelledby="guides-h" className="mt-6">
              <h3 id="guides-h" className="text-sm font-semibold text-muted">How-to guides</h3>
              <ul className="mt-2 flex flex-col gap-3">
                {how.guides.map((g) => (
                  <li key={g.id} className="flex gap-2">
                    <BookOpen size={16} aria-hidden="true" className="mt-1 shrink-0 text-blue" />
                    <div>
                      <a href={g.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-sm font-semibold text-blue underline-offset-2 hover:underline">
                        {g.name}<ArrowUpRight size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                      <p className="text-sm text-ink">{g.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="border-t border-border px-6 py-4">
          <Button className="w-full" onClick={() => onDone(item.goalId)}><Check size={18} aria-hidden="true" /> Mark as done</Button>
        </div>
      </motion.div>
    </div>
  );
}
