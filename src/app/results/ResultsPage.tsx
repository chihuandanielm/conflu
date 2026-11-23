import { startTransition, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import { goals } from "../data/dataset.ts";
import { toPlanInput } from "../intake/model.ts";
import { ConfluenceMap } from "../map/ConfluenceMap.tsx";
import { mapModel } from "../map/facts.ts";
import { OnTrack } from "../requirements/OnTrack.tsx";
import { requirementsFor } from "../requirements/requirements.ts";
import { ResourcesTab } from "../resources/ResourcesTab.tsx";
import { tailoredResources } from "../resources/tailor.ts";
import { useRiver } from "../river/RiverProvider.tsx";
import { diff, finalize, isOutdated, markDone, refresh, reopenDraft, skipGoal, undoDone, undoSkip, type SavedPlan } from "../state/plan.ts";
import { shareHash } from "../state/share.ts";
import { loadSteps, toggleStep } from "../state/steps.ts";
import { isStaleBuildError, ReloadNotice } from "../staleBuild.tsx";
import { todayISO } from "../today.ts";
import { Button } from "../ui/Button.tsx";
import { ComingUp } from "./ComingUp.tsx";
import { Competencies } from "./Competencies.tsx";
import { DraftBanner, EditMap, NotForMe, withoutOptions } from "./EditMap.tsx";
import { GoalDrawer } from "./GoalDrawer.tsx";
import { findItem, GoalPath } from "./GoalPath.tsx";
import { HaveNeed } from "./HaveNeed.tsx";
import { NextMoves } from "./NextMoves.tsx";
import { Notices } from "./Notices.tsx";
import { StartHere } from "./StartHere.tsx";
import { WhyOrder } from "./WhyOrder.tsx";
import { outcomeText, planSummary } from "./summary.ts";

export { planSummary } from "./summary.ts";

const goalTitle = (key: string) => {
  const [id, y] = key.split("@");
  const t = goals.find((g) => g.id === id)?.title ?? id;
  return y ? `${t} (year ${y.slice(1)})` : t;
};

type Tab = "plan" | "map" | "resources" | "courses";
const ALL_TABS: { id: Tab; label: string }[] = [
  { id: "plan", label: "Plan" }, { id: "map", label: "Map" }, { id: "resources", label: "Resources" }, { id: "courses", label: "Courses" },
];
/** When the page arrives with a camera move, the words fade in during the last second of it (design/DESIGN.md §7.3). */
const ARRIVE_MS = 2600, WORDS_AT = 1500;

/**
 * The results page (design/DESIGN.md §7.4): a header over the river (facing downstream), then tabs (Plan, Map,
 * Resources, and Courses for a Rutgers major) that stick to the top once the header has scrolled away, on solid sage
 * that scrolls over the river. The Plan tab opens on what to do now: the "Do this now" card, this semester and good to
 * know, "Why this order"; then where you're headed, what you have and need, coming up, checked off and habits.
 */
export function ResultsPage({ saved, onChange, onEdit }: {
  saved: SavedPlan; onChange: (s: SavedPlan) => void; onEdit: () => void;
  /** Unused here: "Start over" moved to the Edit answers screen (design/DESIGN.md §7.4 #0). */
  onStartOver?: () => void;
}) {
  const { plan, answers } = saved;
  const river = useRiver();
  const reduce = useReducedMotion() || river.reducedMotion;
  const [open, setOpen] = useState<{ item: PlanItem; term: PlanTerm } | null>(null);
  const [progress, setProgress] = useState(loadSteps);
  const onToggleStep = useCallback((goalId: string, i: number) => setProgress((p) => toggleStep(p, goalId, i)), []);
  const [announcement, setAnnouncement] = useState("");
  const h1 = useRef<HTMLHeadingElement>(null);
  const titleBox = useRef<HTMLDivElement>(null);
  const actionsBox = useRef<HTMLDivElement>(null);
  const tablist = useRef<HTMLDivElement>(null);

  // Arrival: the camera turns to face downstream and rises; the page fades in during the last second of the move, and
  // the river dissolves out from under the title and the buttons. Coming back to results needs no move.
  const [shown, setShown] = useState(() => reduce || river.scene === "results");
  // Staged mount: the header, the tabs and "Where you're headed" render at once, so the camera move starts without a
  // stall; the rest renders as an interruptible update just after, while the page is still invisible, so it is ready
  // before the page fades in. (Without a river, as in unit tests, or with reduced motion, everything renders at once.)
  const [settled, setSettled] = useState(() => reduce || river.scene === "results" || river.scene === null);
  const leaving = useRef(false);
  /** Draw only the river the student can see: the band above the tabs (the page below is opaque sage). */
  const clip = useCallback(() => {
    if (leaving.current) return;
    const top = tablist.current?.getBoundingClientRect().top ?? 0;
    if (top <= 0) { river.pause(); river.setClip(0); return; }
    river.resume(); river.setClip(top);
  }, [river]);
  const frame = useCallback((fadeMs = 0) => {
    const pad = (el: HTMLElement | null, p: number) => {
      const r = el?.getBoundingClientRect();
      return r ? [{ x: r.left - p, y: r.top - p, w: r.width + p * 2, h: r.height + p * 2 }] : [];
    };
    river.setMasks([...pad(titleBox.current, 10), ...pad(actionsBox.current, 8)], { fadeMs });
  }, [river]);
  useEffect(() => {
    h1.current?.focus({ preventScroll: true });
    river.setHints({ sky: titleBox.current?.getBoundingClientRect().bottom ?? 0 });
    if (river.scene === "results" || reduce) { river.setScene("results"); frame(); setShown(true); clip(); return; }
    void river.goTo("results", { ms: ARRIVE_MS });
    const raf = requestAnimationFrame(() => startTransition(() => setSettled(true)));
    const t = window.setTimeout(() => { frame(700); setShown(true); }, WORDS_AT);
    // Once the page has faded in and covers everything below the tabs, stop drawing the river there.
    const c = window.setTimeout(clip, WORDS_AT + 600);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t); window.clearTimeout(c); };
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The river is only seen above the tabs: draw just that band, follow it as the page scrolls, pause once it has
  // scrolled away, and keep the header's words clear. Leaving the results gives the river the whole screen back.
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { if (!shown) return; clip(); frame(); });
    };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [river, frame, clip, shown]);
  useEffect(() => () => { river.setClip(null); river.resume(); }, [river]);
  /** Before leaving (the page fades out over the river), give the river the whole screen again. */
  const leave = (go: () => void) => () => { leaving.current = true; river.setClip(null); river.resume(); go(); };

  const replan = useCallback((next: SavedPlan, message: (moved: number) => string) => {
    const d = diff(saved.plan, next.plan);
    setAnnouncement(message(d.moved.size + d.added.size));
    onChange(next);
  }, [saved, onChange]);
  const close = useCallback(() => setOpen(null), []);
  const done = useCallback((goalId: string) => {
    setOpen(null);
    replan(markDone(saved, goalId, todayISO()), (n) => `Marked “${goalTitle(goalId)}” done. Plan updated${n ? `; ${n} ${n === 1 ? "goal" : "goals"} moved` : ""}.`);
  }, [saved, replan]);
  const skip = useCallback((goalId: string) => {
    setOpen(null);
    const must = saved.plan.terms.some((t) => t.items.some((i) => i.goalId === goalId && i.importance === "must"));
    replan(skipGoal(saved, goalId, todayISO()), () => `Crossed out “${goalTitle(goalId)}”${must ? ", an essential must-do" : ""}. Undo it under Not for me.`);
  }, [saved, replan]);
  const unskip = useCallback((goalId: string) => replan(undoSkip(saved, goalId, todayISO()), () => `“${goalTitle(goalId)}” is back on your map.`), [saved, replan]);
  const openItem = useCallback((item: PlanItem, term: PlanTerm) => setOpen({ item, term }), []);
  const openGoal = useCallback((goalId: string) => { const hit = findItem(plan, goalId); if (hit) setOpen({ item: hit.it, term: hit.t }); }, [plan]);

  // Tabs (design/DESIGN.md §7.4a): a real tablist; arrow keys move between tabs; the choice is not saved.
  const [tab, setTab] = useState<Tab>("plan");
  const tabIds = { plan: useId(), map: useId(), resources: useId(), courses: useId() };
  const hasCourses = !!requirementsFor(answers.majorId, answers.school);
  const TABS = ALL_TABS.filter((t) => t.id !== "courses" || hasCourses);
  const panelId = useId();
  /** Back to the top of the panel, once the new one is in (the tabs stay stuck at the top of the window). */
  const toPanelTop = useCallback(() => {
    const top = (tablist.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top });
  }, []);
  const choose = (next: Tab, focus = false) => {
    if (next === tab) return;
    setTab(next);
    if (reduce) requestAnimationFrame(toPanelTop);
    if (focus) requestAnimationFrame(() => document.getElementById(tabIds[next])?.focus());
  };
  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const to = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i + TABS.length - 1) % TABS.length
      : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    choose(TABS[to].id, true);
  };

  const input = useMemo(() => toPlanInput(answers, plan.meta.generatedFor, { completedGoals: saved.completedGoals }), [answers, plan, saved.completedGoals]);
  const counts: Record<Tab, number | null> = useMemo(() => ({
    plan: null, courses: null,
    map: new Set(plan.terms.flatMap((t) => t.items.map((it) => it.goalId))).size,
    // Counting resources runs the eligibility rules over every resource: part of the staged update.
    resources: settled ? tailoredResources(plan, input).length : null,
  }), [plan, input, settled]);
  // The Plan tab reads as what the student's time fits; the draft's extra options are on the Map tab, to cross out or keep.
  const core = useMemo(() => withoutOptions(plan), [plan]);
  const finalized = saved.finalized ?? true;
  const [toEditMap, setToEditMap] = useState(false);
  const arrived = useCallback(() => setToEditMap(false), []);
  const toEdit = () => { setToEditMap(true); choose("map"); };
  const banner = (onEdit?: () => void) => (
    <DraftBanner plan={plan} finalized={finalized} weeklyHours={answers.weeklyHours} onEdit={onEdit}
      onFinalize={() => replan(finalize(saved, todayISO()), () => "Map finalized: sized to your time.")}
      onReopen={() => replan(reopenDraft(saved, todayISO()), () => "Back to the draft map, with more options.")} />
  );
  const fullModel = useMemo(() => mapModel(plan, outcomeText(answers.trackId)), [plan, answers.trackId]);
  const termOf = useCallback((id: string) => findItem(plan, id)?.t.label, [plan]);

  const [pdfState, setPdfState] = useState<"idle" | "working" | "error" | "stale">("idle");
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
  const fade = `transition-opacity duration-[520ms] ease-confluence ${shown ? "opacity-100" : "opacity-0"}`;

  return (
    <div className="min-h-dvh">
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      {/* 0. Header, over the river. On a phone the river sits between the title and the buttons. */}
      <header inert={!!open} className={`mx-auto flex min-h-[250px] max-w-[1040px] flex-col justify-between px-5 pt-[22px] pb-5 min-[760px]:block min-[760px]:min-h-[300px] ${fade}`}>
        <div ref={titleBox} className="max-w-[440px]">
          <h1 ref={h1} tabIndex={-1} className="text-h1">Your plan</h1>
          <p className="mt-2 text-small">{planSummary(answers)}</p>
        </div>
        <div>
          {/* As wide as the buttons (not the header): the river is cleared from under exactly this box. */}
          <div ref={actionsBox} className="mt-4 flex w-fit max-w-full flex-wrap gap-2 [&_.btn]:px-3 [&_.btn]:text-small min-[600px]:[&_.btn]:px-4 min-[600px]:[&_.btn]:text-body">
            <Button variant="outline" small onClick={() => void downloadPdf()} disabled={pdfState === "working"}
              aria-describedby={pdfState === "error" || pdfState === "stale" ? "pdf-error" : undefined}>
              {pdfState === "working" ? "Preparing PDF" : "Download PDF"}
            </Button>
            <Button variant="outline" small onClick={() => void share()}>Share link</Button>
            <Button variant="outline" small onClick={leave(onEdit)}>Edit answers</Button>
          </div>
          {shareUrl && (
            <div className="mt-3 max-w-[640px] bg-sage">
              <label className="block text-small" htmlFor="share-url">
                Share link (copied). It opens your answers for review; it never includes your answers about identity, gender, or citizenship.
              </label>
              <input id="share-url" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()}
                className="mt-1 min-h-11 w-full border-0 border-b-[1.5px] border-blue bg-sage font-mono text-fact" />
            </div>
          )}
          {pdfState === "error" && <p id="pdf-error" role="alert" className="notice mt-3 bg-sage text-small">The PDF couldn't be created. Try again, or use your browser's print option.</p>}
          {pdfState === "stale" && <div className="mt-3 bg-sage"><ReloadNotice id="pdf-error" /></div>}
        </div>
      </header>

      {/* The page: solid sage, scrolling over the river. */}
      <div className={`min-h-dvh bg-sage ${fade}`}>
        <nav ref={tablist} inert={!!open} aria-label="Plan, map and resources" className="sticky top-0 z-20 bg-sage">
          <div role="tablist" aria-label="Your plan" onKeyDown={onTabKey} className="mx-auto flex max-w-[1000px] border-b-[1.5px] border-blue min-[600px]:mx-5 min-[1040px]:mx-auto">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" id={tabIds[t.id]} aria-selected={tab === t.id} aria-controls={panelId}
                tabIndex={tab === t.id ? 0 : -1} onClick={() => choose(t.id)}
                className={`min-h-12 flex-auto px-1.5 text-small whitespace-nowrap transition-colors duration-[140ms] ease-confluence min-[600px]:flex-none min-[600px]:px-5 min-[600px]:text-body
                  ${tab === t.id ? "bg-blue text-sage" : "bg-sage text-blue hover:bg-blue hover:text-sage"}`}>
                {t.label}
                {counts[t.id] !== null && <span className="fact ml-1.5 min-[600px]:ml-2">{counts[t.id]}</span>}
              </button>
            ))}
          </div>
        </nav>

        <main inert={!!open} className="mx-auto max-w-[1040px] px-5 pb-10">
          <AnimatePresence mode="wait" initial={false} onExitComplete={toPanelTop}>
            <motion.div key={tab} id={panelId} role="tabpanel" aria-labelledby={tabIds[tab]} tabIndex={-1}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.26 }}>
              {tab === "plan" && (
                <>
                  {outdated && (
                    <div className="notice mt-8 flex flex-wrap items-center gap-3">
                      <p className="flex-1">Your plan was built on older data. Refresh it.</p>
                      <Button variant="outline" small onClick={() => replan(refresh(saved, todayISO()), (n) => `Plan refreshed${n ? `; ${n} goals changed` : ""}.`)}>Refresh plan</Button>
                    </div>
                  )}
                  {/* 1. Do this now, this semester, and why this order: the first screen. */}
                  <div className="pt-8"><StartHere term={core.terms[0]} progress={progress} onOpen={openItem} edges={plan.edges} doneCount={saved.completedGoals.length} /></div>
                  <div className="pt-10">
                    <NextMoves term={core.terms[0]} onOpen={openItem} progress={progress} weeklyHours={answers.weeklyHours} edges={plan.edges} />
                    <Notices warnings={plan.warnings} dismissed={saved.dismissed} onDismiss={(w) => onChange({ ...saved, dismissed: [...saved.dismissed, w] })} />
                    <div className="mt-4"><WhyOrder trackId={answers.trackId} /></div>
                  </div>
                  <hr className="shore mt-10" />
                  <div className="pt-10">{banner(toEdit)}</div>
                  <div className="py-10"><GoalPath plan={core} trackId={answers.trackId} done={saved.completedGoals} onOpen={openItem} onFullMap={() => choose("map")} /></div>
                  {settled && <>
                  <hr className="shore" />
                  <div className="py-10"><HaveNeed plan={core} answers={answers} onOpen={openItem} /></div>
                  <hr className="shore" />
                  <div className="py-10"><ComingUp plan={core} done={saved.completedGoals} onOpen={openItem} /></div>
                  {(saved.completedGoals.length > 0 || plan.ongoing.length > 0 || plan.skipped.length > 0) && (
                    <>
                      <hr className="shore" />
                      <div className="flex flex-col gap-10 py-10">
                        {saved.completedGoals.length > 0 && (
                          <section aria-labelledby="done-h">
                            <h2 id="done-h" className="text-h2">Checked off</h2>
                            <ul className="mt-3">
                              {saved.completedGoals.map((g) => (
                                <li key={g} className="flex items-baseline gap-3 py-[7px]">
                                  <span aria-hidden="true" className="dot dot--done translate-y-px" />
                                  <span className="flex-1">{goalTitle(g)}</span>
                                  <button type="button" className="btn btn--text"
                                    onClick={() => replan(undoDone(saved, g, todayISO()), () => `“${goalTitle(g)}” is back in your plan.`)}>
                                    Undo<span className="sr-only"> {goalTitle(g)}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}
                        {plan.skipped.length > 0 && <NotForMe plan={plan} onUndo={unskip} />}
                        {plan.ongoing.length > 0 && (
                          <section aria-labelledby="ongoing-h">
                            <h2 id="ongoing-h" className="text-h2">Habits to keep</h2>
                            <ul className="mt-3">
                              {plan.ongoing.map((o) => (
                                <li key={o.goalId} className="flex items-baseline gap-3 py-[7px]">
                                  <span aria-hidden="true" className="dot translate-y-px" />
                                  <span>{o.title}<span className="block text-small">{o.why}</span></span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}
                      </div>
                    </>
                  )}
                  </>}
                </>
              )}

              {tab === "map" && (
                <>
                  <div className="pt-10">{banner()}</div>
                  <section aria-labelledby="map-h" className="py-10">
                    <h2 id="map-h" className="text-h2">Your full map</h2>
                    <p className="mt-2 max-w-[40em]">Every goal is a stream. It joins the river in the semester you start it and stays in it to the end.</p>
                    <div className="mt-5">
                      <ConfluenceMap model={fullModel} done={saved.completedGoals} label="Your plan as a confluence: every goal joining one river"
                        termOf={termOf} onOpen={openGoal} />
                    </div>
                  </section>
                  <hr className="shore" />
                  <div className="py-10"><EditMap plan={plan} trackId={answers.trackId} onOpen={openItem} onDone={done} onSkip={skip} onUndoSkip={unskip} arrive={toEditMap} onArrived={arrived} /></div>
                  <hr className="shore" />
                  <div className="py-10"><Competencies c={plan.competencies} /></div>
                </>
              )}

              {tab === "resources" && <div className="py-10"><ResourcesTab plan={plan} input={input} /></div>}

              {/* The courses the major requires, by year, from the official Rutgers catalog (dated and linked). */}
              {tab === "courses" && hasCourses && <div className="py-10"><OnTrack answers={answers} /></div>}
            </motion.div>
          </AnimatePresence>

          {/* 7. Footer. */}
          <hr className="shore" />
          <footer className="max-w-[46em] pt-6 text-small">
            A starting point, not a rulebook: adjust it as you learn what fits. Built in your browser from dataset
            <span className="fact"> {plan.meta.dataVersion}</span> and planning engine <span className="fact">{plan.meta.engineVersion}</span>. Nothing you entered left this device.
          </footer>
        </main>
      </div>

      <AnimatePresence>
        {open && <GoalDrawer key={open.item.goalId} item={open.item} term={open.term} identity={answers.identity} onClose={close} onDone={done} onSkip={skip}
          progress={progress} onToggleStep={onToggleStep} />}
      </AnimatePresence>
    </div>
  );
}
