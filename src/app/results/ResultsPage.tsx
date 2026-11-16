import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Download, Link2, List, Network, RefreshCw, RotateCcw, Pencil, Undo2 } from "lucide-react";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import { goals, intake } from "../data/dataset.ts";
import { campusName, majorName, trackName, type Answers } from "../intake/model.ts";
import { diff, isOutdated, markDone, refresh, undoDone, type SavedPlan } from "../state/plan.ts";
import { todayISO } from "../today.ts";
import { Button } from "../ui/Button.tsx";
import { Competencies } from "./Competencies.tsx";
import { GoalDrawer } from "./GoalDrawer.tsx";
import { NextMoves } from "./NextMoves.tsx";
import { StartHere } from "./StartHere.tsx";
import { UpNext } from "./UpNext.tsx";
import { Notices } from "./Notices.tsx";
import { Timeline } from "./Timeline.tsx";
import { useMediaQuery } from "./useMediaQuery.ts";
import { ResourcesTab } from "../resources/ResourcesTab.tsx";
import { toPlanInput } from "../intake/model.ts";
import { shareHash } from "../state/share.ts";
import { loadSteps, toggleStep } from "../state/steps.ts";
import { ChunkBoundary, isStaleBuildError, ReloadNotice } from "../staleBuild.tsx";
import { load, save } from "../state/storage.ts";

const RoadmapChart = lazy(() => import("../chart/RoadmapChart.tsx"));
const MODE_KEY = "cpm.roadmap-view"; // per-viewer convenience: chart or list on desktop

export function planSummary(a: Answers): string {
  const horizon = intake.horizons.find((h) => h.id === (a.horizon ?? "graduation"))?.label.toLowerCase();
  return `${trackName(a.trackId)} · ${majorName(a.majorId)}, year ${a.year}${a.enrollment === "part-time" ? " (part-time)" : ""} · ${campusName(a.school)} · ${horizon} · ${a.weeklyHours} free hrs/week`;
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
  const [progress, setProgress] = useState(loadSteps);
  const onToggleStep = useCallback((goalId: string, i: number) => setProgress((p) => toggleStep(p, goalId, i)), []);
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

  const [tab, setTab] = useState<"plan" | "resources">("plan");
  const [pdfState, setPdfState] = useState<"idle" | "working" | "error" | "stale">("idle");
  const input = useMemo(() => toPlanInput(answers, plan.meta.generatedFor, { completedGoals: saved.completedGoals }), [answers, plan, saved.completedGoals]);
  const downloadPdf = async () => {
    setPdfState("working");
    try {
      const { downloadRoadmapPdf } = await import("../pdf/download.ts");
      await downloadRoadmapPdf(saved);
      setPdfState("idle"); setAnnouncement("Your PDF is downloading.");
    } catch (e) {
      console.error("PDF generation failed", e);
      setPdfState(isStaleBuildError(e) ? "stale" : "error");
    }
  };

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}${shareHash(answers)}`;
    try { await navigator.clipboard.writeText(url); setAnnouncement("Link copied."); setShareUrl(url); }
    catch { setShareUrl(url); }
  };

  const outdated = isOutdated(saved);
  const ongoing = plan.ongoing;

  return (
    <div className="min-h-dvh">
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      <header className="border-b border-border bg-bg" inert={!!open}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-end gap-4 px-4 py-8 sm:px-8">
          <div className="w-full min-w-0 sm:w-auto sm:flex-1">
            <p className="font-mono text-xs text-muted">Career Pathway Mapper</p>
            <h1 ref={h1} tabIndex={-1} className="mt-2 text-2xl font-semibold outline-none">Your career roadmap</h1>
            <p className="mt-2 text-base text-ink">{planSummary(answers)}</p>
            <p className="mt-1 text-sm text-muted">A general trajectory, not a blueprint. Adjust it as you learn what fits.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void downloadPdf()} disabled={pdfState === "working"} aria-describedby={pdfState === "error" || pdfState === "stale" ? "pdf-error" : undefined}>
              <Download size={16} aria-hidden="true" /> {pdfState === "working" ? "Preparing PDF" : "Download PDF"}
            </Button>
            <Button variant="secondary" onClick={() => void share()}><Link2 size={16} aria-hidden="true" /> Share link</Button>
            <Button variant="secondary" onClick={onEdit}><Pencil size={16} aria-hidden="true" /> Edit answers</Button>
            <Button variant="ghost" onClick={onStartOver}><RotateCcw size={16} aria-hidden="true" /> Start over</Button>
          </div>
        </div>
        {shareUrl && (
          <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-8">
            <label className="block text-sm text-muted" htmlFor="share-url">
              Share link (copied). It opens your answers for review; it never includes your answers about identity or citizenship.
            </label>
            <input id="share-url" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()}
              className="mt-1 min-h-10 w-full rounded-md border border-border-strong bg-surface px-3 font-mono text-xs text-ink" />
          </div>
        )}
        {pdfState === "error" && (
          <p id="pdf-error" role="alert" className="mx-auto max-w-5xl px-4 pb-4 text-sm text-amber sm:px-8">The PDF couldn't be created. Try again, or use your browser's print option.</p>
        )}
        {pdfState === "stale" && (
          <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-8"><ReloadNotice id="pdf-error" /></div>
        )}
        <div role="tablist" aria-label="Results" className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-8">
          {([["plan", "Your plan"], ["resources", "Your resources"]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}
              onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = tab === "plan" ? "resources" : "plan"; setTab(n); document.getElementById(`tab-${n}`)?.focus(); } }}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors duration-150 ${tab === id ? "border-blue text-ink" : "border-transparent text-muted hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === "resources" ? (
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8" inert={!!open}>
          <div id="panel-resources" role="tabpanel" aria-labelledby="tab-resources"><ResourcesTab plan={plan} input={input} /></div>
        </main>
      ) : (
      <main inert={!!open}>
      <div id="panel-plan" role="tabpanel" aria-labelledby="tab-plan" className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 sm:px-8">
        {outdated && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-blue/20 bg-blue-tint px-4 py-3 text-sm">
            <p className="flex-1">Your plan was built on older data. Refresh it.</p>
            <Button variant="secondary" onClick={() => replan(refresh(saved, todayISO()), (n) => `Plan refreshed${n ? `; ${n} goals changed` : ""}.`)}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh plan
            </Button>
          </div>
        )}

        <StartHere term={plan.terms[0]} progress={progress} onOpen={openItem} edges={plan.edges} />

        <NextMoves term={plan.terms[0]} onOpen={openItem} progress={progress} weeklyHours={answers.weeklyHours} edges={plan.edges} />

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
              <ChunkBoundary fallback={<p className="rounded-md border border-border bg-surface p-6 text-sm text-muted">The chart couldn't load. Switch to the list view to see your plan.</p>}>
              <Suspense fallback={<div className="flex h-[68vh] min-h-[520px] items-center justify-center rounded-md border border-border bg-surface text-sm text-muted">Loading the chart</div>}>
                <RoadmapChart plan={plan} changed={changed} selectedGoal={open?.item.goalId ?? null} onOpen={openItem} />
              </Suspense>
              </ChunkBoundary>
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

        <UpNext backlog={plan.backlog} />

        <footer className="border-t border-border pt-6 text-xs text-muted">
          Built in your browser from the Career Pathway Mapper dataset <span className="font-mono">{plan.meta.dataVersion}</span> and
          planning engine <span className="font-mono">{plan.meta.engineVersion}</span>. Nothing you entered left this device.
        </footer>
      </div>
      </main>
      )}

      <AnimatePresence>
        {open && <GoalDrawer key={open.item.goalId} item={open.item} term={open.term} identity={answers.identity} onClose={close} onDone={done}
          progress={progress} onToggleStep={onToggleStep} />}
      </AnimatePresence>
    </div>
  );
}
