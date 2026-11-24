import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import { goals, intake } from "../data/dataset.ts";
import { toPlanInput } from "../intake/model.ts";
import { ConfluenceMap } from "../map/ConfluenceMap.tsx";
import { mapModel, termWeeks } from "../map/facts.ts";
import { FeedbackForm } from "../feedback/FeedbackForm.tsx";
import { SAMPLE_WHO } from "../state/sample.ts";
import { DegreeAudit } from "../requirements/DegreeAudit.tsx";
import { OnTrack } from "../requirements/OnTrack.tsx";
import { requirementsFor } from "../requirements/requirements.ts";
import { ResourcesTab } from "../resources/ResourcesTab.tsx";
import { tailoredResources } from "../resources/tailor.ts";
import { diff, finalize, isOutdated, markDone, markDoneMany, refresh, reopenDraft, setHours, skipGoal, undoDone, undoSkip, type SavedPlan } from "../state/plan.ts";
import { shareHash } from "../state/share.ts";
import { loadSteps, toggleStep } from "../state/steps.ts";
import { isStaleBuildError, ReloadNotice } from "../staleBuild.tsx";
import { todayISO } from "../today.ts";
import { toTop } from "../ui/scroll.ts";
import { Button } from "../ui/Button.tsx";
import { ComingUp } from "./ComingUp.tsx";
import { Competencies } from "./Competencies.tsx";
import { DraftBanner, DraftLine, EditMap, NotForMe, withoutOptions } from "./EditMap.tsx";
import { GoalDrawer } from "./GoalDrawer.tsx";
import { findItem, GoalPath } from "./GoalPath.tsx";
import { HaveNeed } from "./HaveNeed.tsx";
import { NextMoves } from "./NextMoves.tsx";
import { Notices } from "./Notices.tsx";
import { SectionHead } from "./SectionHead.tsx";
import { AlreadyDone } from "./AlreadyDone.tsx";
import { StartHere } from "./StartHere.tsx";
import { StatusStrip } from "./StatusStrip.tsx";
import { WhyOrder } from "./WhyOrder.tsx";
import { milestones, outcomeText, planSummary } from "./summary.ts";

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

/**
 * The results page (design/DESIGN.md §7.4): a plain header on sage, then tabs (Plan, Map, Resources, and Courses: a
 * Rutgers major's course list, or how to read a degree audit) that stick to the top once the header has scrolled away. The page fades in as a whole (App.tsx). The Plan tab opens on what to do now: the "Do this now" card, this semester and good to
 * know, "Why this order"; then where you're headed, what you have and need, coming up, checked off and habits.
 */
export function ResultsPage({ saved, onChange, onEdit, onStartOver, sample = false, embedded = false }: {
  saved: SavedPlan; onChange: (s: SavedPlan) => void; onEdit: () => void;
  /** A real plan: unused here ("Start over" is on the Edit answers screen, design/DESIGN.md §7.4 #0). The sample plan:
   *  "Build my own plan", which starts the questions. */
  onStartOver?: () => void;
  /** The landing's sample plan: a banner says whose plan it is and that nothing is saved. */
  sample?: boolean;
  /** Shown inside another page (the landing's sample plan): the title is an h2, and arriving doesn't jump to the top
   *  of the page or take the focus; the page that holds it scrolls to it. */
  embedded?: boolean;
}) {
  const { plan, answers } = saved;
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<{ item: PlanItem; term: PlanTerm } | null>(null);
  // The sample plan starts with no ticks and keeps them in memory, so it never mixes with the student's own.
  const [progress, setProgress] = useState(() => (sample ? {} : loadSteps()));
  const onToggleStep = useCallback((item: PlanItem, i: number) => setProgress((p) => toggleStep(p, item, i, !sample)), [sample]);
  const [announcement, setAnnouncement] = useState("");
  const h1 = useRef<HTMLHeadingElement>(null);
  const tablist = useRef<HTMLDivElement>(null);
  // Arriving (the previous screen has faded out): start at the top, then focus the title. Embedded, the holder decides.
  useEffect(() => { if (!embedded) { toTop(); h1.current?.focus({ preventScroll: true }); } }, [embedded]);
  const Title = embedded ? "h2" : "h1";

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
  const doneMany = useCallback((goalIds: string[]) => {
    replan(markDoneMany(saved, goalIds, todayISO()), (n) => `Marked ${goalIds.length} ${goalIds.length === 1 ? "goal" : "goals"} done. Plan updated${n ? `; ${n} ${n === 1 ? "goal" : "goals"} moved` : ""}.`);
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
  // Phase 6.2: with no course list (another school), the Courses tab explains the degree audit instead.
  const TABS = ALL_TABS;
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
    resources: tailoredResources(plan, input).length,
  }), [plan, input]);
  // The Plan tab reads as what the student's time fits; the draft's extra options are on the Map tab, to cross out or keep.
  const core = useMemo(() => withoutOptions(plan), [plan]);
  const finalized = saved.finalized ?? true;
  const hours = answers.weeklyHours ?? intake.defaultWeeklyHours;
  const bigCount = useMemo(() => milestones(core).length, [core]);
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

  return (
    <div className="min-h-dvh">
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      {sample && (
        <div role="note" aria-label="Sample plan" className="notice mx-auto mt-5 flex max-w-[1000px] flex-wrap items-center gap-x-4 gap-y-2 min-[600px]:mx-5 min-[1040px]:mx-auto">
          <p className="flex-1 basis-[22em]">This is a sample plan for {SAMPLE_WHO}. Try anything; nothing is saved.</p>
          <button type="button" className="btn btn--small" onClick={onStartOver}>Build my own plan <span aria-hidden="true" className="font-mono">-&gt;</span></button>
        </div>
      )}
      {/* 0. Header: title, destination, summary, actions. */}
      <header inert={!!open} className="mx-auto max-w-[1040px] px-5 pt-8 pb-7 min-[760px]:pt-14 min-[760px]:pb-9">
        {/* The title is where the student is headed, set large; "your plan" is its small drafting label. */}
        <div className="max-w-[860px]">
          <Title ref={h1} tabIndex={-1}>
            <span className="kicker font-normal text-ink">{sample ? "sample plan" : "your plan"}</span>{" "}
            <span className="mt-3 block text-[clamp(2.125rem,1.4rem+3vw,4rem)] leading-[0.95] tracking-[-0.005em]">{outcomeText(answers.trackId)}</span>
          </Title>
          <p className="fact mt-3">{planSummary(answers).toLowerCase()}</p>
        </div>
        <div>
          <div className="mt-4 flex w-fit max-w-full flex-wrap gap-2 [&_.btn]:whitespace-nowrap min-[380px]:flex-nowrap min-[600px]:flex-wrap [&_.btn]:px-3 [&_.btn]:text-small min-[600px]:[&_.btn]:px-4 min-[600px]:[&_.btn]:text-body">
            <Button variant="outline" small onClick={() => void downloadPdf()} disabled={pdfState === "working"}
              aria-describedby={pdfState === "error" || pdfState === "stale" ? "pdf-error" : undefined}>
              {pdfState === "working" ? "Preparing PDF" : "Download PDF"}
            </Button>
            <Button variant="outline" small onClick={() => void share()}>Share link</Button>
            <Button variant="outline" small onClick={onEdit}>Edit answers</Button>
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

      {/* The page under the sticky tabs. */}
      <div className="min-h-dvh">
        <nav ref={tablist} inert={!!open} aria-label="Plan, map and resources" className="paper sticky top-0 z-20">
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
                  {/* 1-2. A two-column sheet (design/DESIGN.md §7.4): this semester on the left (the term, the hours meter, the
                      hours control); on the right "Do this now", "Already done?", then this semester's goals, notes and why
                      this order. On a phone "Do this now" comes first and this semester's panel follows it. */}
                  <div className="grid gap-x-12 gap-y-6 pt-8 min-[900px]:grid-cols-[260px_minmax(0,1fr)] min-[900px]:grid-rows-[auto_1fr]">
                    {/* In document order (and on a phone): this semester's panel, compact, then "Do this now", so both are on
                        a phone's first screen; then the rest. From 900px the panel takes its own column on the left. */}
                    <aside aria-label="This semester at a glance" className="min-[900px]:sticky min-[900px]:top-20 min-[900px]:col-start-1 min-[900px]:row-span-2 min-[900px]:row-start-1 min-[900px]:self-start">
                      <StatusStrip term={core.terms[0]} doneCount={saved.completedGoals.length} weeklyHours={hours}
                        onHours={(h) => replan(setHours(saved, h, todayISO()), (n) => `Re-planned for ${h} free hours a week${n ? `; ${n} goals moved` : ""}.`)} />
                    </aside>
                    <div className="min-w-0 min-[900px]:col-start-2 min-[900px]:row-start-1">
                      <StartHere term={core.terms[0]} progress={progress} onOpen={openItem} edges={plan.edges} />
                    </div>
                    <div className="min-w-0 min-[900px]:col-start-2 min-[900px]:row-start-2">
                      {/* Right after the one action, so "Do this now" stays on the first screen of a phone. */}
                      <AlreadyDone key={`${core.terms[0].code}:${saved.completedGoals.length}`} term={core.terms[0]} dismissed={saved.dismissed} onDone={doneMany}
                        onHide={(k) => onChange({ ...saved, dismissed: [...saved.dismissed, k] })} />
                      <div className="pt-10">
                        <NextMoves term={core.terms[0]} onOpen={openItem} progress={progress} weeklyHours={hours} edges={plan.edges} />
                        <Notices warnings={plan.warnings} dismissed={saved.dismissed} onDismiss={(w) => onChange({ ...saved, dismissed: [...saved.dismissed, w] })} />
                        <div className="mt-4"><WhyOrder trackId={answers.trackId} /></div>
                      </div>
                    </div>
                  </div>
                  {<>
                  {/* 3. Your path (Phase 4.1): where you're headed, then every later semester folded by year, then what you
                      have and need, folded, so the Plan tab stays short. */}
                  <section aria-labelledby="path-h" className="pt-10">
                    <SectionHead id="path-h" title="Your path" count={`${bigCount} ${bigCount === 1 ? "milestone" : "milestones"}`} />
                    <div className="mt-5 border-[1.5px] border-blue p-[clamp(16px,3vw,24px)]">
                      <GoalPath plan={core} trackId={answers.trackId} done={saved.completedGoals} onOpen={openItem} onFullMap={() => choose("map")} />
                    </div>
                    <div className="pt-8"><ComingUp plan={core} done={saved.completedGoals} onOpen={openItem} /></div>
                    <details className="group mt-3">
                      <summary className="flex min-h-11 cursor-pointer list-none items-baseline gap-3 border-[1.5px] border-blue px-3 py-2 text-blue group-open:bg-blue group-open:text-sage [&::-webkit-details-marker]:hidden">
                        <span aria-hidden="true" className="w-3.5 font-mono group-open:hidden">+</span>
                        <span aria-hidden="true" className="hidden w-3.5 font-mono group-open:inline">-</span>
                        <span className="label flex-1 text-[1.1875rem]">What you have and what you need</span>
                      </summary>
                      <div className="pt-5"><HaveNeed plan={core} answers={answers} onOpen={openItem} /></div>
                    </details>
                  </section>
                  {/* 5. Housekeeping: the draft in one line. */}
                  <div className="pt-10"><DraftLine plan={plan} finalized={finalized} weeklyHours={hours} onEdit={toEdit} /></div>
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
              {tab === "courses" && <div className="py-10">{hasCourses ? <OnTrack answers={answers} ephemeral={sample} /> : <DegreeAudit />}</div>}
            </motion.div>
          </AnimatePresence>

          {/* 7. Footer. */}
          <hr className="shore" />
          <footer className="max-w-[46em] pt-6 text-small">
            A starting point, not a rulebook: adjust it as you learn what fits. Built in your browser from dataset
            <span className="fact"> {plan.meta.dataVersion}</span> and planning engine <span className="fact">{plan.meta.engineVersion}</span>. Nothing you entered left this device.
            <FeedbackForm dataVersion={plan.meta.dataVersion} engineVersion={plan.meta.engineVersion} />
          </footer>
        </main>
      </div>

      <AnimatePresence>
        {open && <GoalDrawer key={open.item.goalId} item={open.item} term={open.term} identity={answers.identity} onClose={close} onDone={done} onSkip={skip}
          progress={progress} onToggleStep={onToggleStep} weeks={open.term.code === plan.terms[0]?.code ? termWeeks(open.term, hours) : undefined} />}
      </AnimatePresence>
    </div>
  );
}
