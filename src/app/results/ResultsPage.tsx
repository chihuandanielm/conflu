import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, BookOpen, Download, Link2, List, Network, RefreshCw, RotateCcw, Pencil, Undo2 } from "lucide-react";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import { goals, intake } from "../data/dataset.ts";
import { campusName, majorName, trackName, yearTermLabel, type Answers } from "../intake/model.ts";
import { diff, isOutdated, markDone, refresh, undoDone, type SavedPlan } from "../state/plan.ts";
import { todayISO } from "../today.ts";
import { Button } from "../ui/Button.tsx";
import { Competencies } from "./Competencies.tsx";
import { GoalDrawer } from "./GoalDrawer.tsx";
import { NextMoves } from "./NextMoves.tsx";
import { StartHere } from "./StartHere.tsx";
import { ComingUp } from "./ComingUp.tsx";
import { GoalPath } from "./GoalPath.tsx";
import { HaveNeed } from "./HaveNeed.tsx";
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
  const when = yearTermLabel(a) ?? `Year ${a.year}`;
  return `${trackName(a.trackId)} · ${majorName(a.majorId)} · ${when}${a.enrollment === "part-time" ? " (part-time)" : ""} · ${campusName(a.school)} · ${a.weeklyHours} free hours a week`;
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

  const [view, setView] = useState<"plan" | "map" | "resources">("plan");
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

  const backToPlan = () => { setView("plan"); window.scrollTo({ top: 0 }); };
  const viewHeader = (title: string) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={backToPlan}><ArrowLeft size={16} aria-hidden="true" /> Back to your plan</Button>
      <h2 className="text-h2">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-dvh">
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      <header className="border-b border-blue bg-sage" inert={!!open}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-end gap-4 px-4 py-6 sm:px-8">
          <div className="w-full min-w-0 sm:w-auto sm:flex-1">
            <h1 ref={h1} tabIndex={-1} className="text-h1 outline-none">Your plan</h1>
            <p className="mt-1 text-small text-blue">{planSummary(answers)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void downloadPdf()} disabled={pdfState === "working"} aria-describedby={pdfState === "error" || pdfState === "stale" ? "pdf-error" : undefined}>
              <Download size={16} aria-hidden="true" /> {pdfState === "working" ? "Preparing PDF" : "Download PDF"}
            </Button>
            <Button variant="outline" onClick={() => void share()}><Link2 size={16} aria-hidden="true" /> Share link</Button>
            <Button variant="outline" onClick={onEdit}><Pencil size={16} aria-hidden="true" /> Edit answers</Button>
            <Button variant="text" onClick={onStartOver}><RotateCcw size={16} aria-hidden="true" /> Start over</Button>
          </div>
        </div>
        {shareUrl && (
          <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-8">
            <label className="block text-small text-blue" htmlFor="share-url">
              Share link (copied). It opens your answers for review; it never includes your answers about identity, gender, or citizenship.
            </label>
            <input id="share-url" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()}
              className="mt-1 min-h-10 w-full border border-blue bg-sage px-3 font-mono text-fact text-blue" />
          </div>
        )}
        {pdfState === "error" && (
          <p id="pdf-error" role="alert" className="mx-auto max-w-5xl px-4 pb-4 text-small text-blue sm:px-8">The PDF couldn't be created. Try again, or use your browser's print option.</p>
        )}
        {pdfState === "stale" && (
          <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-8"><ReloadNotice id="pdf-error" /></div>
        )}
      </header>

      <main inert={!!open} className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-8">
        {view === "resources" && (
          <>
            {viewHeader("All resources for your plan")}
            <ResourcesTab plan={plan} input={input} />
          </>
        )}

        {view === "map" && (
          <>
            {viewHeader("Your full map")}
            {desktop && (
              <div role="group" aria-label="Map view" className="inline-flex self-start overflow-hidden border border-blue">
                {([["chart", "Chart", Network], ["list", "List", List]] as const).map(([m, label, Icon]) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-small ${mode === m ? "bg-sage text-blue" : "bg-sage text-blue hover:bg-sage"}`}>
                    <Icon size={14} aria-hidden="true" />{label}
                  </button>
                ))}
              </div>
            )}
            {desktop && mode === "chart" ? (
              <ChunkBoundary fallback={<p className="border border-blue bg-sage p-6 text-small text-blue">The chart couldn't load. Switch to the list view to see your plan.</p>}>
              <Suspense fallback={<div className="flex h-[68vh] min-h-[520px] items-center justify-center border border-blue bg-sage text-small text-blue">Loading the chart</div>}>
                <RoadmapChart plan={plan} changed={changed} selectedGoal={open?.item.goalId ?? null} onOpen={openItem} />
              </Suspense>
              </ChunkBoundary>
            ) : (
              <Timeline plan={plan} changed={changed} onOpen={openItem} />
            )}
            <Competencies c={plan.competencies} />
          </>
        )}

        {view === "plan" && (
          <>
            {outdated && (
              <div className="flex flex-wrap items-center gap-3 border border-blue bg-sage px-4 py-3 text-small">
                <p className="flex-1">Your plan was built on older data. Refresh it.</p>
                <Button variant="outline" onClick={() => replan(refresh(saved, todayISO()), (n) => `Plan refreshed${n ? `; ${n} goals changed` : ""}.`)}>
                  <RefreshCw size={16} aria-hidden="true" /> Refresh plan
                </Button>
              </div>
            )}

            <GoalPath plan={plan} trackId={answers.trackId} onOpen={openItem} />
            <HaveNeed plan={plan} answers={answers} onOpen={openItem} />

            <div className="flex flex-col gap-4">
              <StartHere term={plan.terms[0]} progress={progress} onOpen={openItem} edges={plan.edges} />
              <NextMoves term={plan.terms[0]} onOpen={openItem} progress={progress} weeklyHours={answers.weeklyHours} edges={plan.edges} />
              <Notices warnings={plan.warnings} dismissed={saved.dismissed}
                onDismiss={(w) => onChange({ ...saved, dismissed: [...saved.dismissed, w] })} />
            </div>

            <ComingUp plan={plan} onOpen={openItem} />

            {saved.completedGoals.length > 0 && (
              <section aria-labelledby="done-h">
                <h2 id="done-h" className="text-h2">Checked off</h2>
                <ul className="mt-4 flex flex-col gap-2">
                  {saved.completedGoals.map((g) => (
                    <li key={g} className="flex items-center gap-3 bg-sage px-4 py-2 text-small">
                      <span className="flex-1">{goalTitle(g)}</span>
                      <button type="button" className="inline-flex items-center gap-1 text-blue hover:underline"
                        onClick={() => replan(undoDone(saved, g, todayISO()), () => `“${goalTitle(g)}” is back in your plan.`)}>
                        <Undo2 size={14} aria-hidden="true" /> Undo<span className="sr-only"> {goalTitle(g)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {ongoing.length > 0 && (
              <section aria-labelledby="ongoing-h">
                <h2 id="ongoing-h" className="text-lead">Habits to keep</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {ongoing.map((o) => <li key={o.goalId} className="text-small"><span className="">{o.title}.</span> <span className="text-blue">{o.why}</span></li>)}
                </ul>
              </section>
            )}

            <nav aria-label="More views" className="flex flex-wrap gap-3 border-t border-blue pt-6">
              <Button variant="outline" onClick={() => { setView("map"); window.scrollTo({ top: 0 }); }}><Network size={16} aria-hidden="true" /> See the full map</Button>
              <Button variant="outline" onClick={() => { setView("resources"); window.scrollTo({ top: 0 }); }}><BookOpen size={16} aria-hidden="true" /> All resources</Button>
            </nav>
          </>
        )}

        <footer className="border-t border-blue pt-6 text-small text-blue">
          A starting point, not a rulebook: adjust it as you learn what fits. Built in your browser from dataset
          <span className="font-mono"> {plan.meta.dataVersion}</span> and planning engine <span className="font-mono">{plan.meta.engineVersion}</span>. Nothing you entered left this device.
        </footer>
      </main>

      <AnimatePresence>
        {open && <GoalDrawer key={open.item.goalId} item={open.item} term={open.term} identity={answers.identity} onClose={close} onDone={done}
          progress={progress} onToggleStep={onToggleStep} />}
      </AnimatePresence>
    </div>
  );
}
