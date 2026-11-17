import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import { goals } from "../data/dataset.ts";
import { campusName, majorName, toPlanInput, trackName, yearTermLabel, type Answers } from "../intake/model.ts";
import { ConfluenceMap } from "../map/ConfluenceMap.tsx";
import { mapModel } from "../map/facts.ts";
import { ResourcesTab } from "../resources/ResourcesTab.tsx";
import { tailoredResources } from "../resources/tailor.ts";
import { useRiver } from "../river/RiverProvider.tsx";
import { diff, isOutdated, markDone, refresh, undoDone, type SavedPlan } from "../state/plan.ts";
import { shareHash } from "../state/share.ts";
import { loadSteps, toggleStep } from "../state/steps.ts";
import { isStaleBuildError, ReloadNotice } from "../staleBuild.tsx";
import { todayISO } from "../today.ts";
import { Button } from "../ui/Button.tsx";
import { ComingUp } from "./ComingUp.tsx";
import { Competencies } from "./Competencies.tsx";
import { GoalDrawer } from "./GoalDrawer.tsx";
import { findItem, GoalPath } from "./GoalPath.tsx";
import { HaveNeed } from "./HaveNeed.tsx";
import { NextMoves } from "./NextMoves.tsx";
import { Notices } from "./Notices.tsx";
import { StartHere } from "./StartHere.tsx";
import { outcomeText } from "./summary.ts";

export function planSummary(a: Answers): string {
  const when = yearTermLabel(a) ?? `Year ${a.year}`;
  return `${trackName(a.trackId)} · ${majorName(a.majorId)} · ${when}${a.enrollment === "part-time" ? " (part-time)" : ""} · ${campusName(a.school)} · ${a.weeklyHours} free hours a week`;
}

const goalTitle = (key: string) => {
  const [id, y] = key.split("@");
  const t = goals.find((g) => g.id === id)?.title ?? id;
  return y ? `${t} (year ${y.slice(1)})` : t;
};

type Tab = "plan" | "map" | "resources";
const TABS: { id: Tab; label: string }[] = [{ id: "plan", label: "Plan" }, { id: "map", label: "Map" }, { id: "resources", label: "Resources" }];
/** When the page arrives with a camera move, the words fade in during the last second of it (design/DESIGN.md §7.3). */
const ARRIVE_MS = 2600, WORDS_AT = 1500;

/**
 * The results page (design/DESIGN.md §7.4): a header over the river (facing downstream), then three tabs (Plan, Map,
 * Resources) that stick to the top once the header has scrolled away, on solid sage that scrolls over the river.
 * The Plan tab keeps the product's order: where you're headed, what you have and need, start here, this semester and
 * good to know, coming up, checked off and habits.
 */
export function ResultsPage({ saved, onChange, onEdit, onStartOver }: {
  saved: SavedPlan; onChange: (s: SavedPlan) => void; onEdit: () => void; onStartOver: () => void;
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
    if (river.scene === "results" || reduce) { river.setScene("results"); frame(); setShown(true); return; }
    void river.goTo("results", { ms: ARRIVE_MS });
    const t = window.setTimeout(() => { frame(700); setShown(true); }, WORDS_AT);
    return () => window.clearTimeout(t);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The river is only seen at the top: stop drawing once it has scrolled away, and keep it clear of the header's words.
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (window.scrollY > window.innerHeight * 0.7) river.pause();
        else { river.resume(); frame(); }
      });
    };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); river.resume(); };
  }, [river, frame]);

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
  const openItem = useCallback((item: PlanItem, term: PlanTerm) => setOpen({ item, term }), []);
  const openGoal = useCallback((goalId: string) => { const hit = findItem(plan, goalId); if (hit) setOpen({ item: hit.it, term: hit.t }); }, [plan]);

  // Tabs (design/DESIGN.md §7.4a): a real tablist; arrow keys move between tabs; the choice is not saved.
  const [tab, setTab] = useState<Tab>("plan");
  const tabIds = { plan: useId(), map: useId(), resources: useId() };
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
  const counts = useMemo(() => ({
    map: new Set(plan.terms.flatMap((t) => t.items.map((it) => it.goalId))).size,
    resources: tailoredResources(plan, input).length,
  }), [plan, input]);
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
      <header inert={!!open} className={`mx-auto flex min-h-[380px] max-w-[1040px] flex-col justify-between px-5 pt-[22px] pb-6 min-[760px]:block min-[760px]:min-h-[300px] ${fade}`}>
        <div ref={titleBox} className="max-w-[440px]">
          <h1 ref={h1} tabIndex={-1} className="text-h1">Your plan</h1>
          <p className="mt-2 text-small">{planSummary(answers)}</p>
        </div>
        <div>
          <div ref={actionsBox} className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" small onClick={() => void downloadPdf()} disabled={pdfState === "working"}
              aria-describedby={pdfState === "error" || pdfState === "stale" ? "pdf-error" : undefined}>
              {pdfState === "working" ? "Preparing PDF" : "Download PDF"}
            </Button>
            <Button variant="outline" small onClick={() => void share()}>Share link</Button>
            <Button variant="outline" small onClick={onEdit}>Edit answers</Button>
            <Button variant="text" small onClick={onStartOver}>Start over</Button>
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
                className={`min-h-12 flex-1 px-5 transition-colors duration-[140ms] ease-confluence min-[600px]:flex-none
                  ${tab === t.id ? "bg-blue text-sage" : "bg-sage text-blue hover:bg-blue hover:text-sage"}`}>
                {t.label}
                {t.id !== "plan" && <span className="fact ml-2">{counts[t.id]}</span>}
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
                  <div className="py-10"><GoalPath plan={plan} trackId={answers.trackId} done={saved.completedGoals} onOpen={openItem} onFullMap={() => choose("map")} /></div>
                  <hr className="shore" />
                  <div className="py-10"><HaveNeed plan={plan} answers={answers} onOpen={openItem} /></div>
                  <div className="pb-10"><StartHere term={plan.terms[0]} progress={progress} onOpen={openItem} edges={plan.edges} /></div>
                  <div className="pb-10">
                    <NextMoves term={plan.terms[0]} onOpen={openItem} progress={progress} weeklyHours={answers.weeklyHours} edges={plan.edges} />
                    <Notices warnings={plan.warnings} dismissed={saved.dismissed} onDismiss={(w) => onChange({ ...saved, dismissed: [...saved.dismissed, w] })} />
                  </div>
                  <hr className="shore" />
                  <div className="py-10"><ComingUp plan={plan} done={saved.completedGoals} onOpen={openItem} /></div>
                  {(saved.completedGoals.length > 0 || plan.ongoing.length > 0) && (
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
                </>
              )}

              {tab === "map" && (
                <>
                  <section aria-labelledby="map-h" className="py-10">
                    <h2 id="map-h" className="text-h2">Your full map</h2>
                    <p className="mt-2 max-w-[40em]">Every goal is a stream. It joins the river in the semester you start it and stays in it to the end.</p>
                    <div className="mt-5">
                      <ConfluenceMap model={fullModel} done={saved.completedGoals} label="Your plan as a confluence: every goal joining one river"
                        termOf={termOf} onOpen={openGoal} />
                    </div>
                  </section>
                  <hr className="shore" />
                  <div className="py-10"><Competencies c={plan.competencies} /></div>
                </>
              )}

              {tab === "resources" && <div className="py-10"><ResourcesTab plan={plan} input={input} /></div>}
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
        {open && <GoalDrawer key={open.item.goalId} item={open.item} term={open.term} identity={answers.identity} onClose={close} onDone={done}
          progress={progress} onToggleStep={onToggleStep} />}
      </AnimatePresence>
    </div>
  );
}
