import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { LANE_LABEL, laneTint } from "./lanes.ts";
import { Tag } from "./Tag.tsx";

/**
 * The plan as a vertical timeline: terms as sections, items as rows. Used on phones and as the
 * accessible "list view" on desktop. Rows animate when a re-plan moves them.
 */
export function Timeline({ plan, onOpen, changed }: {
  plan: Plan; onOpen: (it: PlanItem, t: PlanTerm) => void; changed: Set<string>;
}) {
  const reduce = useReducedMotion();
  return (
    <ol className="flex flex-col gap-6">
      {plan.terms.map((t, ti) => (
        <li key={t.code}>
          <section aria-labelledby={`term-${t.code}`}>
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
              <h3 id={`term-${t.code}`} className="text-lg font-semibold">
                {t.label}{ti === 0 && <span className="ml-2 text-sm font-normal text-muted">(now)</span>}
              </h3>
              <span className="font-mono text-xs text-muted">
                <span className="sr-only">Hours planned: </span>{t.usedHours} of {t.capacityHours} h
              </span>
            </header>
            {t.items.length === 0 ? (
              <p className="py-3 text-sm text-muted">{t.capacityHours === 0 ? "No free time planned this term." : "Nothing scheduled. Room for something from “If you have more time”."}</p>
            ) : (
              <ul className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {t.items.map((it) => (
                    <motion.li key={`${t.code}-${it.goalId}`} layout={!reduce}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: reduce ? 0.01 : 0.22, ease: "easeOut" }}>
                      <button type="button" onClick={() => onOpen(it, t)}
                        className={`group flex w-full items-center gap-3 rounded-sm px-2 py-3 text-left transition-colors duration-150 hover:bg-surface
                          ${changed.has(it.goalId) ? "bg-blue-tint" : ""}`}>
                        <span aria-hidden="true" className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: laneTint(it.lane), boxShadow: "inset 0 0 0 1px var(--border-strong)" }} />
                        <span className="flex-1">
                          <span className="block text-xs text-muted">{LANE_LABEL[it.lane]}</span>
                          <span className="block font-semibold text-ink group-hover:text-blue">{it.title}</span>
                          <span className="mt-1 flex flex-wrap gap-2">
                            {it.gate && <Tag tone="gate">Must-do</Tag>}
                            {it.partial && <Tag tone="partial">Continues</Tag>}
                            {it.hours >= 300 && <Tag tone="partial">Full-time</Tag>}
                            {changed.has(it.goalId) && <Tag tone="moved">Updated</Tag>}
                          </span>
                        </span>
                        <span className="font-mono text-xs text-muted">{it.hours} h</span>
                        <ChevronRight size={18} aria-hidden="true" className="text-muted" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>
        </li>
      ))}
    </ol>
  );
}
