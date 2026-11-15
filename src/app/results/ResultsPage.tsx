import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { List, Network, RefreshCw, RotateCcw, Pencil, Undo2 } from "lucide-react";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import { goals, intake } from "../data/dataset.ts";
import { majorName, trackName, type Answers } from "../intake/model.ts";
import { diff, isOutdated, markDone, refresh, undoDone, type SavedPlan } from "../state/plan.ts";
import { todayISO } from "../today.ts";
import { Button } from "../ui/Button.tsx";
import { Competencies } from "./Competencies.tsx";
import { GoalDrawer } from "./GoalDrawer.tsx";
import { NextMoves } from "./NextMoves.tsx";
import { Notices } from "./Notices.tsx";
import { Timeline } from "./Timeline.tsx";
import { useMediaQuery } from "./useMediaQuery.ts";
import { load, save } from "../state/storage.ts";

const RoadmapChart = lazy(() => import("../chart/RoadmapChart.tsx"));
const MODE_KEY = "cpm.roadmap-view"; // per-viewer convenience: chart or list on desktop

export function planSummary(a: Answers): string {
  const horizon = intake.horizons.find((h) => h.id === (a.horizon ?? "graduation"))?.label.toLowerCase();
  return `${trackName(a.trackId)} · ${majorName(a.majorId)}, year ${a.year} · ${horizon} · ${a.weeklyHours} hrs/week`;
}

const goalTitle = (key: string) => {
  const [id, y] = key.split("@");
  const t = goals.find((g) => g.id === id)?.title ?? id;
  return y ? `${t} (year ${y.slice(1)})` : t;
};

export function ResultsPage({ saved, onChange, onEdit, onStartOver }: {
  saved: SavedPlan; onChange: (s: SavedPlan) => void; onEdit: () => void; onStartOver: () => void;
}) {
  const { plan, answers } = saved;
  const [open, setOpen] = useState<{ item: PlanItem; term: PlanTerm } | null>(null);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!changed.size) return;
    const t = window.setTimeout(() => setChanged(new Set()), 4000);
    return () => window.clearTimeout(t);
  }, [changed]);

  const replan = useCallback((next: SavedPlan, message: (moved: number) => string) => {
    const d = diff(saved.plan, next.plan);
    setChanged(new Set([...d.moved, ...d.added]));
    setAnnouncement(message(d.moved.size + d.added.size));
    onChange(next);
  }, [saved, onChange]);

  const close = useCallback(() => setOpen(null), []);
  const done = useCallback((goalId: string) => {
    setOpen(null);
    replan(markDone(saved, goalId, todayISO()), (n) => `Marked “${goalTitle(goalId)}” done. Plan updated${n ? `; ${n} ${n === 1 ? "goal" : "goals"} moved` : ""}.`);
  }, [saved, replan]);

  const desktop = useMediaQuery("(min-width: 768px)");
  const [mode, setMode] = useState<"chart" | "list">(() => (load<string>(MODE_KEY) === "list" ? "list" : "chart"));
  useEffect(() => { save(MODE_KEY, mode); }, [mode]);
  const openItem = useCallback((item: PlanItem, term: PlanTerm) => setOpen({ item, term }), []);

  const outdated = isOutdated(saved);
  const ongoing = plan.ongoing;

  return (
    <div className="min-h-dvh">
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end gap-4 px-4 py-8 sm:px-8">
          <div className="w-full min-w-0 sm:w-auto sm:flex-1">
            <p className="font-mono text-xs text-muted">Career Pathway Mapper</p>
            <h1 ref={h1} tabIndex={-1} className="mt-2 text-2xl font-semibold outline-none">Your career roadmap</h1>
            <p className="mt-2 text-base text-ink">{planSummary(answers)}</p>
            <p className="mt-1 text-sm text-muted">A general trajectory, not a blueprint. Adjust it as you learn what fits.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onEdit}><Pencil size={16} aria-hidden="true" /> Edit answers</Button>
            <Button variant="ghost" onClick={onStartOver}><RotateCcw size={16} aria-hidden="true" /> Start over</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 sm:px-8">
        {outdated && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-blue/20 bg-blue-tint px-4 py-3 text-sm">
            <p className="flex-1">Your plan was built on older data. Refresh it.</p>
            <Button variant="secondary" onClick={() => replan(refresh(saved, todayISO()), (n) => `Plan refreshed${n ? `; ${n} goals changed` : ""}.`)}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh plan
            </Button>
          </div>
        )}

        <NextMoves term={plan.terms[0]} onOpen={openItem} />

        <Notices warnings={plan.warnings} dismissed={saved.dismissed}
          onDismiss={(w) => onChange({ ...saved, dismissed: [...saved.dismissed, w] })} />

        <section aria-labelledby="roadmap-h">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="roadmap-h" className="text-xl font-semibold">Semester by semester</h2>
              <p className="mt-1 text-sm text-muted">Select any goal for the reasons behind it, where to start, and to check it off.</p>
            </div>
            {desktop && (
              <div role="group" aria-label="Roadmap view" className="inline-flex overflow-hidden rounded-md border border-border-strong">
                {([["chart", "Chart", Network], ["list", "View as list", List]] as const).map(([m, label, Icon]) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold ${mode === m ? "bg-blue-tint text-ink" : "bg-bg text-muted hover:bg-surface"}`}>
                    <Icon size={14} aria-hidden="true" />{label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6">
            {desktop && mode === "chart" ? (
              <Suspense fallback={<div className="flex h-[68vh] min-h-[520px] items-center justify-center rounded-md border border-border bg-surface text-sm text-muted">Loading the chart</div>}>
                <RoadmapChart plan={plan} changed={changed} selectedGoal={open?.item.goalId ?? null} onOpen={openItem} />
              </Suspense>
            ) : (
              <Timeline plan={plan} changed={changed} onOpen={openItem} />
            )}
          </div>
        </section>

        {saved.completedGoals.length > 0 && (
          <section aria-labelledby="done-h">
            <h2 id="done-h" className="text-xl font-semibold">Checked off</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {saved.completedGoals.map((g) => (
                <li key={g} className="flex items-center gap-3 rounded-md bg-green-tint px-4 py-2 text-sm">
                  <span className="flex-1">{goalTitle(g)}</span>
                  <button type="button" className="inline-flex items-center gap-1 font-semibold text-blue hover:underline"
                    onClick={() => replan(undoDone(saved, g, todayISO()), () => `“${goalTitle(g)}” is back in your plan.`)}>
                    <Undo2 size={14} aria-hidden="true" /> Undo<span className="sr-only"> {goalTitle(g)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Competencies c={plan.competencies} />

        {ongoing.length > 0 && (
          <section aria-labelledby="ongoing-h">
            <h2 id="ongoing-h" className="text-xl font-semibold">Ongoing habits</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {ongoing.map((o) => (
                <li key={o.goalId} className="rounded-md border border-border px-4 py-3">
                  <p className="font-semibold">{o.title}</p>
                  <p className="mt-1 text-sm text-muted">{o.why}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {plan.backlog.length > 0 && (
          <section aria-labelledby="backlog-h">
            <details className="group rounded-md border border-border">
              <summary className="cursor-pointer list-none px-4 py-3">
                <h2 id="backlog-h" className="inline text-xl font-semibold">If you have more time</h2>
                <span className="ml-2 text-sm text-muted">{plan.backlog.length} goals</span>
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {plan.backlog.map((b) => (
                  <li key={b.goalId} className="px-4 py-3">
                    <p className="font-semibold">{b.title}</p>
                    <p className="mt-1 text-sm text-muted">{b.reason}</p>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        )}

        <footer className="border-t border-border pt-6 text-xs text-muted">
          Built in your browser from the Career Pathway Mapper dataset <span className="font-mono">{plan.meta.dataVersion}</span> and
          planning engine <span className="font-mono">{plan.meta.engineVersion}</span>. Nothing you entered left this device.
        </footer>
      </main>

      <AnimatePresence>
        {open && <GoalDrawer key={open.item.goalId} item={open.item} term={open.term} identity={answers.identity} onClose={close} onDone={done} />}
      </AnimatePresence>
    </div>
  );
}
