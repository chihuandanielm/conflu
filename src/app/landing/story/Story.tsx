import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import type { Plan, PlanTerm } from "../../../engine/types.ts";
import { intake, uiIntake } from "../../data/dataset.ts";
import { COPY } from "../../intake/copy.ts";
import { tracksForMajor } from "../../intake/model.ts";
import { QuestionShell } from "../../intake/QuestionShell.tsx";
import { SingleChoice } from "../../intake/controls/SingleChoice.tsx";
import { ConfluenceMap } from "../../map/ConfluenceMap.tsx";
import { mapModel } from "../../map/facts.ts";
import { withoutOptions } from "../../results/EditMap.tsx";
import { PriorityTag } from "../../results/GoalRow.tsx";
import { inWorkOrder } from "../../results/order.ts";
import { ResultsPage } from "../../results/ResultsPage.tsx";
import { StartHere } from "../../results/StartHere.tsx";
import { StatusStrip } from "../../results/StatusStrip.tsx";
import { outcomeText } from "../../results/summary.ts";
import { createSaved, type SavedPlan } from "../../state/plan.ts";
import { SAMPLE_ANSWERS } from "../../state/sample.ts";
import { howTo } from "../../state/steps.ts";
import { ProgressBar } from "../../ui/ProgressBar.tsx";
import { todayISO } from "../../today.ts";
import { useBeats, useForwardProgress, useNear, usePlay } from "./useForwardProgress.ts";

const noop = () => {};
const EASE = [0.22, 0.61, 0.36, 1] as const;
type Accent = "violet" | "sand" | "blue" | "green";
type Scene = { play: boolean; reduced: boolean };
/** A delay for one piece of a scene (the CSS in styles.css reads it as --d). */
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * How it works (docs/STORY_DESIGN.md): the landing's hook. One sample student goes from the first question to a finished
 * plan. Four short steps, each a caption beside the app's own screen, frozen (inert, hidden from assistive tech; the
 * caption says what it shows). Nothing is pinned: each step's scene plays once, on a clock of about 2 s, when the step
 * comes into view, and stays finished. A spine down the left grows with the scroll and pops a dot as each step plays;
 * it ends in the logo's ring at the finished plan. Each step teaches one colour's job (violet picks, ochre "look here
 * first", the map, verdigris done), marked by drafting corners and a label in the window's bar. With reduced motion
 * nothing moves and every scene shows finished.
 */
export function Story() {
  const reduced = !!useReducedMotion();
  const sample = useMemo(() => createSaved(SAMPLE_ANSWERS, todayISO()), []);
  const core = useMemo(() => withoutOptions(sample.plan), [sample]);
  const term = core.terms[0];
  const end = useRef<HTMLElement>(null);
  const steps = useRef<HTMLDivElement>(null);
  // The spine grows as the steps pass the lower part of the screen, and never shrinks back.
  const raw = useForwardProgress(steps, reduced, ["start 75%", "end 75%"]);
  // Smoothed, so the line glides after the scroll instead of stepping with each wheel notch.
  const grown = useSpring(raw, { stiffness: 140, damping: 28, restDelta: 0.0005 });
  const skip = () => {
    end.current?.scrollIntoView?.({ behavior: reduced ? "auto" : "smooth", block: "start" });
    end.current?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
  };
  return (
    <section aria-labelledby="how-h" className="story border-t-[1.5px] border-blue pt-12 min-[760px]:pt-[72px]">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <h2 id="how-h" className="text-[2.625rem] leading-none min-[760px]:text-[3.5rem]">How it works</h2>
        </div>
        <button type="button" onClick={skip} className="btn btn--text -mr-2">Skip to the finished plan <span aria-hidden="true" className="font-mono">-&gt;</span></button>
      </div>

      <div ref={steps} className="relative mt-6 min-[900px]:mt-10">
        {/* The spine: a dotted track, and the charcoal line growing down it. */}
        <div aria-hidden="true" className="pointer-events-none absolute top-0 bottom-0 left-0 w-3.5 min-[900px]:w-5">
          <span className="absolute top-0 left-1/2 h-full -translate-x-1/2 border-l-[1.5px] border-dotted border-blue" />
          <motion.span style={{ scaleY: grown }} className="absolute top-0 left-1/2 h-full w-[1.5px] origin-top -translate-x-1/2 bg-blue will-change-transform" />
        </div>
        <Step n={1} title="Tell it where you are" accent="violet" mark="your pick" reduced={reduced} fixed
          text="Your campus, major, year, the career you want, and your free time. About 3 minutes, no account, and it works for other schools too."
          shows="the question screens, where a campus, then a career goal, then 5 free hours a week are picked in violet.">
          {(s) => <IntakeScene {...s} />}
        </Step>
        <Step n={2} title="Get what to do now" accent="sand" mark="look here first" reduced={reduced}
          text="This semester's goals, sized to your free hours, with one thing to do first and where to go for it."
          shows="the plan: this semester's panel with its hours meter, and the Do this now window.">
          {(s) => term && <ResultsScene {...s} plan={core} term={term} />}
        </Step>
        <Step n={3} title="See the whole path" accent="blue" mark="your goal" reduced={reduced}
          text="Every goal joins the river in the semester it starts, all the way to your goal."
          shows="the map of the plan's must-do goals drawing itself from now down to the career goal.">
          {(s) => <MapScene {...s} plan={sample.plan} />}
        </Step>
        <Step n={4} title="Do it, one step at a time" accent="green" mark="done" reduced={reduced}
          text="Every goal breaks into small steps, from real guides. Tick them off as you go."
          shows="a goal's steps being ticked off one by one, turning the done colour.">
          {(s) => term && <NextScene {...s} plan={core} term={term} />}
        </Step>
      </div>
      <Finale ref={end} sample={sample} reduced={reduced} />
    </section>
  );
}

/** One step: spine gutter (its dot) | caption | frozen screen in a window. Plays once when it comes into view. */
function Step({ n, title, text, shows, accent, mark, reduced, fixed = false, children }: {
  n: number; title: string; text: string; shows: string; accent: Accent; mark: string; reduced: boolean;
  /** A fixed-height window whose screen fades out at the bottom (the question screens, which run long). Otherwise the
   *  window is as tall as its screen, so nothing is ever cut off. */
  fixed?: boolean; children: (s: Scene) => ReactNode;
}) {
  const ref = useRef<HTMLElement>(null), win = useRef<HTMLDivElement>(null);
  // It plays when its window is about two thirds in view, so the scene starts where the visitor can see it.
  const play = usePlay(win, reduced);
  // Once its scene has finished, the step settles: nothing in it animates again, even if a screen re-lays itself out.
  const settled = useBeats(play, reduced, [SETTLE]) > 0;
  const near = useNear(ref);
  return (
    <section ref={ref} aria-labelledby={`story-${n}`} data-story-step={n} data-play={play ? "" : undefined} data-settled={settled ? "" : undefined}
      className="story-step relative flex gap-3 py-8 min-[900px]:gap-8 min-[900px]:py-12">
      <div aria-hidden="true" className="relative w-3.5 flex-none min-[900px]:w-5">
        {/* The step's stop on the spine: an open ring whose dot pops in as the scene starts. */}
        <span className="absolute top-[0.35rem] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[1.5px] border-blue bg-sage min-[900px]:top-[calc(50%-7px)]">
          <span className="sa sa-pop absolute inset-[2px] rounded-full bg-blue" />
        </span>
      </div>
      <div className="grid min-w-0 flex-1 gap-4 min-[900px]:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] min-[900px]:items-center min-[900px]:gap-12">
        {/* The caption arrives with its window, line by line. */}
        <div className="min-[900px]:max-w-[22em]">
          <p className="kicker sa sa-rise" style={d(0)}>step {n}</p>
          <h3 id={`story-${n}`} className="sa sa-rise mt-3 text-[clamp(1.6rem,1.2rem+1.8vw,2.75rem)] leading-[1]" style={d(70)}>{title}</h3>
          <p className="sa sa-rise mt-3 max-[899px]:text-small" style={d(140)}>{text}</p>
          <p className="sr-only">Beside it is a picture of {shows}</p>
        </div>
        {/* The frozen screen: real components, nothing to click or tab to, hidden from screen readers (the caption says it). */}
        <div ref={win} aria-hidden="true" inert className={`win sa sa-frame pointer-events-none relative overflow-hidden select-none ${fixed ? "h-[460px] min-[900px]:h-[min(540px,72svh)]" : ""}`}>
          <div className="win-bar win-bar--quiet"><Legend accent={accent} label={mark} at={CALLOUT[n - 1]} /></div>
          <div className={fixed ? "story-fade relative h-[calc(100%-29px)] overflow-hidden" : "relative"}>{near && children({ play, reduced })}</div>
        </div>
      </div>
    </section>
  );
}

/** When each step's callout lands (ms after its scene starts): the corners snap in and the bar shows its label. */
const CALLOUT = [3300, 2000, 2200, 2500];
/** When every scene has finished (the last callout plus its animation). */
const SETTLE = 3900;
const SWATCH: Record<Accent, string> = { violet: "bg-violet", sand: "border-ochre bg-sand", blue: "bg-blue", green: "bg-green" };

/** The callout's label, in the window's title bar: a swatch of the colour the step teaches, and its job. */
function Legend({ accent, label, at }: { accent: Accent; label: string; at: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`sa sa-pop h-3 w-3 border-[1.5px] border-blue ${SWATCH[accent]}`} style={d(at)} />
      <span className="sa sa-rise" style={d(at + 80)}>{label}</span>
    </span>
  );
}

/** Drafting corners that snap in around their child at `at` ms. */
function Corners({ at, children, className = "" }: { at: number; children: ReactNode; className?: string }) {
  const c = "absolute h-3.5 w-3.5 border-blue";
  return (
    <div className={`relative ${className}`}>
      {children}
      <div aria-hidden="true" className="sa sa-snap pointer-events-none absolute -inset-2.5" style={d(at)}>
        <span className={`${c} top-0 left-0 border-t-[1.5px] border-l-[1.5px]`} /><span className={`${c} top-0 right-0 border-t-[1.5px] border-r-[1.5px]`} />
        <span className={`${c} bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]`} /><span className={`${c} right-0 bottom-0 border-r-[1.5px] border-b-[1.5px]`} />
      </div>
    </div>
  );
}

/** Gives each matching element in `root` a staggered --d, in document order. Runs once the scene is laid out. */
function useStagger(root: React.RefObject<HTMLElement | null>, selector: string, start: number, step: number) {
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>(selector).forEach((el, i) => el.style.setProperty("--d", `${start + i * step}ms`));
  }, [root, selector, start, step]);
}

/**
 * Step 1: three question screens, one after another, crossfading like turning pages: the campus options cascade in and
 * one is pressed and turns violet; the career goal; then the free hours. The corners snap round the last answer.
 */
function IntakeScene({ play, reduced }: Scene) {
  // pick campus, to goal, pick goal, to hours, pick hours
  const beat = useBeats(play, reduced, [900, 1350, 1950, 2400, 2950]);
  const root = useRef<HTMLDivElement>(null);
  useStagger(root, ".story-cascade [role=radio]", 260, 60);
  const schools = uiIntake.school.options.map((o) => ({ value: o.id, label: o.label, note: "note" in o ? (o.note as string) : undefined }));
  // Just the question lines (no help text), so on a phone the answers being picked stay inside the window.
  const goals = tracksForMajor(SAMPLE_ANSWERS.majorId).suggested.map((t) => ({ value: t.id, label: t.name }));
  const hours = intake.weeklyHours.map((h) => ({ value: h, label: `${h} hours a week outside class` }));
  const sheet = (at: number, leaves?: number) => `story-press absolute inset-x-0 top-0 ${leaves !== undefined && beat >= leaves ? "story-out" : beat >= at ? "story-in" : "story-wait"}`;
  return (
    <div ref={root} className="absolute inset-0 px-[clamp(10px,3vw,28px)] pt-4">
      <ProgressBar label="Intake progress" max={8} value={beat >= 4 ? 7 : beat >= 2 ? 3 : 1} caption={`Step ${beat >= 4 ? 7 : beat >= 2 ? 3 : 1} of 8`} />
      <div className="relative mt-3">
        <div className={`story-cascade ${sheet(0, 2)}`}>
          <QuestionShell copy={{ question: COPY.school.question }} headingId="story-q-school" focusHeading={false} keyHint={false} onBack={noop} onContinue={noop}>
            <SingleChoice numberKeys={false} labelledBy="story-q-school" choices={schools} value={beat >= 1 ? "rutgers-nb" : undefined} onSelect={noop} />
          </QuestionShell>
        </div>
        <div className={sheet(2, 4)}>
          <QuestionShell copy={{ question: COPY.track.question }} headingId="story-q-goal" focusHeading={false} keyHint={false} onBack={noop} onContinue={noop}>
            <SingleChoice numberKeys={false} labelledBy="story-q-goal" choices={goals} value={beat >= 3 ? SAMPLE_ANSWERS.trackId : undefined} onSelect={noop} />
          </QuestionShell>
        </div>
        <div className={sheet(4)}>
          <QuestionShell copy={{ question: "How much time do you have?" }} headingId="story-q-time"
            focusHeading={false} keyHint={false} onBack={noop} onContinue={noop}>
            <Corners at={CALLOUT[0]}>
              <SingleChoice numberKeys={false} labelledBy="story-q-time" choices={hours} value={beat >= 5 ? 5 : undefined} onSelect={noop} />
            </Corners>
          </QuestionShell>
        </div>
      </div>
    </div>
  );
}

/** Step 2: this semester's panel slides in, its hours meter pops in cell by cell, then "Do this now" opens down from its bar. */
function ResultsScene({ plan, term }: Scene & { plan: Plan; term: PlanTerm }) {
  const root = useRef<HTMLDivElement>(null);
  useStagger(root, ".story-meter .grid > span", 650, 70);
  return (
    <div ref={root} className="px-[clamp(10px,3vw,28px)] pt-5 pb-6">
      <div className="sa sa-rise max-[699px]:hidden" style={d(200)}>
        <p className="kicker">sample plan</p>
        <p className="mt-2 font-display text-[clamp(1.5rem,1.1rem+1.6vw,2.5rem)] leading-[0.95] font-bold">{outcomeText(SAMPLE_ANSWERS.trackId)}</p>
      </div>
      <div className="grid gap-x-8 gap-y-4 min-[700px]:mt-5 min-[700px]:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="story-meter sa sa-left min-w-0" style={d(380)}>
          <StatusStrip term={term} doneCount={0} weeklyHours={SAMPLE_ANSWERS.weeklyHours} onHours={noop} />
        </div>
        <div className="sa sa-open min-w-0" style={d(1000)}>
          <Corners at={CALLOUT[1]}><StartHere term={term} progress={{}} onOpen={noop} edges={plan.edges} /></Corners>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 3: the whole map, never cropped (its window is as tall as it is). It draws itself top to bottom: semester lines,
 * then each stream tracing in and its names, semester by semester; the river's mouth and the goal pop in last.
 */
function MapScene({ plan }: Scene & { plan: Plan }) {
  const model = useMemo(() => {
    const shown = new Set<string>();
    for (const t of plan.terms) for (const it of t.items) if (!it.option && !it.goalId.includes("@") && it.importance === "must") shown.add(it.goalId);
    return mapModel(plan, outcomeText(SAMPLE_ANSWERS.trackId), shown);
  }, [plan]);
  const root = useRef<HTMLDivElement>(null);
  // Each piece's delay follows how far down the map it sits, so the drawing runs from now to the goal. Measured after
  // layout and again if the map re-lays itself out (a new width), never per frame.
  useEffect(() => {
    const box = root.current;
    if (!box) return;
    const time = () => {
      const svg = box.querySelector("svg");
      if (!svg) return;
      const h = svg.getBoundingClientRect().height || 1, top = svg.getBoundingClientRect().top;
      const at = (el: Element, extra = 0) => `${Math.round(300 + ((el.getBoundingClientRect().top - top) / h) * 1300 + extra)}ms`;
      svg.querySelectorAll<SVGElement>(":scope > *").forEach((el) => {
        if (el.tagName === "path") el.setAttribute("pathLength", "1");
        el.style.setProperty("--d", at(el, el.tagName === "circle" ? 260 : 0));
      });
      box.querySelectorAll<HTMLElement>("li > *").forEach((el) => el.style.setProperty("--d", at(el, 200)));
    };
    time();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(time) : null;
    ro?.observe(box);
    return () => ro?.disconnect();
  }, [model]);
  return (
    <div ref={root} className="story-map px-[clamp(8px,3vw,32px)] pt-6 pb-8">
      <ConfluenceMap model={model} label="The sample plan as a confluence" />
      <Corners at={CALLOUT[2]} className="pointer-events-none mx-auto -mt-16 h-16 w-[min(70%,420px)]"><span /></Corners>
    </div>
  );
}

/** Step 4: the first goal's steps, ticked one at a time: each tick pops, the line strikes through, the bar fills verdigris. */
function NextScene({ play, reduced, plan, term }: Scene & { plan: Plan; term: PlanTerm }) {
  const ready = inWorkOrder(term.items.filter((i) => !i.option), plan.edges);
  const item = ready.find((i) => i.importance === "must") ?? ready[0];
  const how = howTo(item);
  const n = how.steps.length;
  const beat = useBeats(play, reduced, how.steps.map((_, i) => 750 + i * (1350 / Math.max(1, n - 1))));
  return (
    <div className="sa sa-rise px-[clamp(12px,3vw,30px)] pt-5 pb-6" style={d(200)}>
      <p className="fact">{term.label.toLowerCase()}</p>
      <p className="mt-1.5 font-display text-[clamp(1.4rem,1.1rem+1vw,1.75rem)] leading-[1.1] font-bold">{item.title}</p>
      <p className="mt-2"><PriorityTag it={item} /></p>
      <Corners at={CALLOUT[3]} className="mt-5">
        <div className="flex items-baseline justify-between gap-2 border-t-[3px] border-blue pt-2">
          <p className="font-display text-[1.3125rem] font-bold">What to do</p>
          <p className="fact">{beat} of {n} done</p>
        </div>
        <div className="mt-2 h-2 border-[1.5px] border-blue">
          <div aria-hidden="true" className="h-full origin-left bg-green transition-transform duration-[420ms] ease-confluence" style={{ transform: `scaleX(${beat / Math.max(1, n)})` }} />
        </div>
        <ol className="mt-2">
          {how.steps.map((s, i) => (
            <li key={s} className="grid grid-cols-[22px_1.25rem_1fr] items-start gap-2.5 border-b-[1.5px] border-blue py-2.5">
              <input type="checkbox" className="tick story-tick" checked={i < beat} readOnly tabIndex={-1} />
              <span className="fact">{i + 1}</span>
              <span><span className="story-strike" data-done={i < beat ? "" : undefined}>{s}</span></span>
            </li>
          ))}
        </ol>
      </Corners>
    </div>
  );
}

/** The end of the story: the spine reaches the ring, and the finished sample plan rises into view once. (The button comes
 *  just after, in the landing's closing panel.) */
function Finale({ ref, sample, reduced }: { ref: React.Ref<HTMLElement>; sample: SavedPlan; reduced: boolean }) {
  const local = useRef<HTMLElement>(null);
  const near = useNear(local);
  const setRefs = (el: HTMLElement | null) => { local.current = el; if (typeof ref === "function") ref(el); else if (ref) (ref as React.RefObject<HTMLElement | null>).current = el; };
  return (
    <section ref={setRefs} aria-labelledby="story-end" className="relative flex gap-3 pb-12 min-[900px]:gap-8 min-[760px]:pb-[72px]">
      <div className="relative w-3.5 flex-none min-[900px]:w-5">
        {/* The last stretch of the spine draws once as the finale enters, then the ring pops: the logo's goal. */}
        <motion.span aria-hidden="true" initial={reduced ? false : { scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="absolute top-0 left-1/2 h-12 w-[1.5px] origin-top -translate-x-1/2 bg-blue will-change-transform" />
        <motion.span aria-hidden="true" initial={reduced ? false : { scale: 0.3, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true, amount: 0.6 }}
          transition={{ type: "spring", stiffness: 420, damping: 16, delay: reduced ? 0 : 0.4 }}
          className="absolute top-12 left-1/2 -ml-3 -mt-3 h-6 w-6 rounded-full border-2 border-green bg-sage">
          <span aria-hidden="true" className="absolute inset-[4px] rounded-full bg-green" />
        </motion.span>
      </div>
      <div className="min-w-0 flex-1 pt-8">
        <p className="kicker">the result</p>
        <h3 id="story-end" tabIndex={-1} className="mt-3 text-[clamp(1.6rem,1.2rem+1.8vw,2.75rem)] leading-[1]">Your plan, start to finish</h3>
        <p className="mt-3 max-w-[36em]">Every semester to graduation, with the places to go, a map, resources and your major's courses. This one is the sample student's.</p>
        <p className="sr-only">Below is a picture of the sample student's finished plan, as it appears on the results page.</p>
        <motion.div aria-hidden="true" inert initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="win pointer-events-none mt-8 h-[min(84svh,860px)] overflow-hidden select-none will-change-transform max-[899px]:-ml-[26px] max-[899px]:h-[640px]">
          <div className="win-bar win-bar--quiet"><span className="invisible">.</span></div>
          {/* The plan runs on below; it fades out rather than stopping at a hard edge. On a phone the window takes the
              full width (out past the spine), so the plan inside is laid out as wide as it is on a real phone. */}
          <div className="story-fade h-[calc(100%-29px)] overflow-hidden">{near && <ResultsPage embedded frozen sample saved={sample} onChange={noop} onEdit={noop} />}</div>
        </motion.div>
      </div>
    </section>
  );
}
