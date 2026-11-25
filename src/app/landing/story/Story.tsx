import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import type { Plan, PlanTerm } from "../../../engine/types.ts";
import { intake, uiIntake } from "../../data/dataset.ts";
import { COPY } from "../../intake/copy.ts";
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
import { useForwardProgress, useNear, useStage } from "./useForwardProgress.ts";

const noop = () => {};
/** The three beats of every step (docs/STORY_DESIGN.md §3): the screen arrives, the action happens, the callout marks it. */
const ARRIVE: [number, number] = [0, 0.22], CALLOUT: [number, number] = [0.76, 0.9];
type Accent = "violet" | "sand" | "blue" | "green";

/**
 * How it works (docs/STORY_DESIGN.md): the landing's hook. One sample student goes from the first question to a finished
 * plan while the visitor scrolls. A spine runs down the left and draws itself, a dot fills at each step, and it ends in
 * the logo's ring at the finished plan. Each step teaches one colour's job (violet picks, ochre "look here first", the
 * map, verdigris done), marked by a drafting-corner callout. Every screen is the app's own component with the sample's
 * real plan, frozen (inert, hidden from assistive tech; the caption says what it shows). Progress only moves forward,
 * and everything that moves is a transform, opacity or clip-path driven by a motion value. With reduced motion nothing
 * is pinned and every step shows finished.
 */
export function Story({ cta }: { cta: ReactNode }) {
  const reduced = !!useReducedMotion();
  const sample = useMemo(() => createSaved(SAMPLE_ANSWERS, todayISO()), []);
  const core = useMemo(() => withoutOptions(sample.plan), [sample]);
  const term = core.terms[0];
  const end = useRef<HTMLElement>(null);
  const skip = () => {
    end.current?.scrollIntoView?.({ behavior: reduced ? "auto" : "smooth", block: "start" });
    end.current?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
  };
  return (
    <section aria-labelledby="how-h" className="border-t-[1.5px] border-blue pt-12 min-[760px]:pt-[72px]">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <h2 id="how-h" className="text-[2.625rem] leading-none min-[760px]:text-[3.5rem]">How it works</h2>
          <p className="mt-4 max-w-[36em]">One student, from the first question to a finished plan.</p>
        </div>
        <button type="button" onClick={skip} className="btn btn--text -mr-2">Skip to the finished plan <span aria-hidden="true" className="font-mono">-&gt;</span></button>
      </div>

      <Step n={1} title="Tell it where you are" accent="violet" mark="your pick"
        text="Your campus, major, year, the career you want, and your free time. About 3 minutes, no account, and it works for other schools too."
        shows="the question screens, where a campus is picked and then 5 free hours a week, in violet." reduced={reduced}>
        {(p) => <IntakeScene p={p} />}
      </Step>
      <Step n={2} title="Get what to do now" accent="sand" mark="look here first"
        text="This semester's goals, sized to your free hours, with one thing to do first and where to go for it."
        shows="the plan: this semester's panel with its hours meter, the Do this now window, and this semester's goals." reduced={reduced}>
        {(p) => term && <ResultsScene p={p} plan={core} term={term} />}
      </Step>
      <Step n={3} title="See the whole path" accent="blue" mark="your goal"
        text="Every goal joins the river in the semester it starts, all the way to your goal."
        shows="the map of the plan drawing itself from now down to the career goal." reduced={reduced}>
        {(p) => <MapScene p={p} plan={sample.plan} />}
      </Step>
      <Step n={4} title="Do it, one step at a time" accent="green" mark="done"
        text="Every goal breaks into small steps, from real guides. Tick them off as you go."
        shows="a goal's steps being ticked off one by one, turning the done colour." reduced={reduced}>
        {(p) => term && <NextScene p={p} plan={core} term={term} />}
      </Step>
      <Finale ref={end} sample={sample} cta={cta} reduced={reduced} />
    </section>
  );
}

/** The spine's gutter: a dotted track with a solid line drawn down it by `draw` (0 to 1). */
function Spine({ draw, dot }: { draw: MotionValue<number>; dot?: MotionValue<number> }) {
  return (
    <div aria-hidden="true" className="relative w-3.5 flex-none min-[900px]:w-5">
      <span className={`absolute left-1/2 top-0 w-0 -translate-x-1/2 border-l-[1.5px] border-dotted border-blue h-full`} />
      <motion.span style={{ scaleY: draw }} className={`absolute left-1/2 top-0 w-[1.5px] origin-top -translate-x-1/2 bg-blue will-change-transform h-full`} />
      {dot && (
        <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-blue bg-sage">
          <motion.span style={{ scale: dot }} className="absolute inset-[2px] rounded-full bg-blue will-change-transform" />
        </span>
      )}
    </div>
  );
}

/** One step: a tall section whose frame stays pinned while scrolling plays it. Spine | caption | frozen screen. */
function Step({ n, title, text, shows, accent, mark, reduced, children }: {
  n: number; title: string; text: string; shows: string; accent: Accent; mark: string; reduced: boolean; children: (p: MotionValue<number>) => ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const p = useForwardProgress(ref, reduced);
  const near = useNear(ref);
  const draw = useTransform(p, [0, 0.7], [0, 1]);
  const dot = useTransform(p, [0.7, 0.78], [0, 1]);
  const caption = useTransform(p, [0, 0.06], [0.4, 1]);
  return (
    <section ref={ref} aria-labelledby={`story-${n}`} data-story-step={n}
      className={reduced ? "relative" : "relative h-[230svh] min-[900px]:h-[260svh]"}>
      <div className={`${reduced ? "" : "sticky top-0 h-svh"} flex gap-3 min-[900px]:gap-8`}>
        <Spine draw={draw} dot={dot} />
        <div className="grid min-w-0 flex-1 content-center gap-4 py-5 min-[900px]:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] min-[900px]:items-center min-[900px]:gap-12">
          <motion.div style={{ opacity: caption }} className="min-[900px]:max-w-[22em]">
            <p className="kicker">step {n}</p>
            <h3 id={`story-${n}`} className="mt-3 text-[clamp(1.6rem,1.2rem+1.8vw,2.75rem)] leading-[1]">{title}</h3>
            <p className="mt-3 max-[899px]:text-small">{text}</p>
            <p className="sr-only">Beside it is a picture of {shows}</p>
          </motion.div>
          {/* The frozen screen: real components, nothing to click or tab to, hidden from screen readers (the caption says it). */}
          <div aria-hidden="true" inert className="win pointer-events-none relative h-[min(58svh,560px)] overflow-hidden select-none min-[900px]:h-[min(76svh,660px)]">
            <div className="win-bar win-bar--quiet"><MarkLegend p={p} accent={accent} label={mark} /></div>
            <div className="relative h-[calc(100%-29px)] overflow-hidden">{near && children(p)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

const SWATCH: Record<Accent, string> = { violet: "bg-violet", sand: "border-ochre bg-sand", blue: "bg-blue", green: "bg-green" };

/** The callout's label, in the window's title bar: a swatch of the colour the step teaches, and its job. */
function MarkLegend({ p, accent, label }: { p: MotionValue<number>; accent: Accent; label: string }) {
  const opacity = useTransform(p, CALLOUT, [0, 1]);
  const y = useTransform(p, CALLOUT, [6, 0]);
  return (
    <motion.span style={{ opacity, y }} className="flex items-center gap-2 will-change-transform">
      <span className={`h-3 w-3 border-[1.5px] border-blue ${SWATCH[accent]}`} />{label}
    </motion.span>
  );
}

/** Drafting corners that draw in around their child when the step reaches its callout beat. */
function Corners({ p, children, className = "" }: { p: MotionValue<number>; children: ReactNode; className?: string }) {
  const opacity = useTransform(p, CALLOUT, [0, 1]);
  const scale = useTransform(p, CALLOUT, [1.06, 1]);
  const c = "absolute h-3.5 w-3.5 border-blue";
  return (
    <div className={`relative ${className}`}>
      {children}
      <motion.div aria-hidden="true" style={{ opacity, scale }} className="pointer-events-none absolute -inset-2.5 will-change-transform">
        <span className={`${c} top-0 left-0 border-t-[1.5px] border-l-[1.5px]`} /><span className={`${c} top-0 right-0 border-t-[1.5px] border-r-[1.5px]`} />
        <span className={`${c} bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]`} /><span className={`${c} right-0 bottom-0 border-r-[1.5px] border-b-[1.5px]`} />
      </motion.div>
    </div>
  );
}

/** Rise-and-fade in over a slice of the step's progress. */
function useIn(p: MotionValue<number>, [from, to]: [number, number], dy = 18) {
  return { opacity: useTransform(p, [from, to], [0, 1]), y: useTransform(p, [from, to], [dy, 0]) };
}

/** Step 1: the campus question, answered in violet; then the time question, answered. The fish gauge moves with them. */
function IntakeScene({ p }: { p: MotionValue<number> }) {
  const stage = useStage(p, [0.32, 0.47, 0.66]);
  const first = useIn(p, ARRIVE);
  const firstOut = useTransform(p, [0.42, 0.5], [1, 0]);
  const firstOpacity = useTransform(() => first.opacity.get() * firstOut.get());
  const second = useIn(p, [0.46, 0.56]);
  const schools = uiIntake.school.options.map((o) => ({ value: o.id, label: o.label, note: "note" in o ? (o.note as string) : undefined }));
  const hours = intake.weeklyHours.map((h) => ({ value: h, label: `${h} hours a week outside class` }));
  return (
    <div className="absolute inset-0 overflow-hidden px-[clamp(10px,3vw,28px)] pt-4">
      <ProgressBar label="Intake progress" max={8} value={stage >= 2 ? 7 : 1} caption={stage >= 2 ? "Step 7 of 8" : "Step 1 of 8"} />
      <div className="relative mt-3">
        <motion.div style={{ opacity: firstOpacity, y: first.y }} className="absolute inset-x-0 top-0 will-change-transform">
          <QuestionShell copy={COPY.school} headingId="story-q-school" focusHeading={false} keyHint={false} onBack={noop} onContinue={noop}>
            <SingleChoice numberKeys={false} labelledBy="story-q-school" choices={schools} value={stage >= 1 ? "rutgers-nb" : undefined} onSelect={noop} />
          </QuestionShell>
        </motion.div>
        <motion.div style={second} className="absolute inset-x-0 top-0 will-change-transform">
          <QuestionShell copy={{ question: "How much time do you have?", help: "A rough guess is fine. The plan fits to it." }} headingId="story-q-time"
            focusHeading={false} keyHint={false} onBack={noop} onContinue={noop}>
            <Corners p={p}>
              <SingleChoice numberKeys={false} labelledBy="story-q-time" choices={hours} value={stage >= 3 ? 5 : undefined} onSelect={noop} />
            </Corners>
          </QuestionShell>
        </motion.div>
      </div>
    </div>
  );
}

/** Step 2: the top of the Plan tab arriving piece by piece: the title, this semester's panel and its hours meter, then "Do this now". */
function ResultsScene({ p, plan, term }: { p: MotionValue<number>; plan: Plan; term: PlanTerm }) {
  const title = useIn(p, ARRIVE);
  const panel = { opacity: useTransform(p, [0.2, 0.36], [0, 1]), x: useTransform(p, [0.2, 0.36], [-16, 0]) };
  // The hours meter fills left to right as the panel settles: the plan sized to the student's time.
  // Only the meter is clipped (through a CSS variable), so the panel's words are never cut.
  const meter = useTransform(p, [0.3, 0.52], [100, 0]);
  const meterInset = useTransform(meter, (m) => `${m}%`);
  const now = useIn(p, [0.46, 0.68], 26);
  return (
    <div className="absolute inset-x-0 top-0 px-[clamp(10px,3vw,28px)] pt-5">
      <motion.div style={title} className="max-[699px]:hidden">
        <p className="kicker">sample plan</p>
        <p className="mt-2 font-display text-[clamp(1.5rem,1.1rem+1.6vw,2.5rem)] leading-[0.95] font-bold">{outcomeText(SAMPLE_ANSWERS.trackId)}</p>
      </motion.div>
      <div className="grid gap-x-8 gap-y-4 min-[700px]:mt-5 min-[700px]:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <motion.div style={{ ...panel, "--meter": meterInset } as never} className="min-w-0 [&_[aria-hidden=true].grid]:[clip-path:inset(0_var(--meter)_0_0)]">
          <StatusStrip term={term} doneCount={0} weeklyHours={SAMPLE_ANSWERS.weeklyHours} onHours={noop} />
        </motion.div>
        <motion.div style={now} className="min-w-0"><Corners p={p}><StartHere term={term} progress={{}} onOpen={noop} edges={plan.edges} /></Corners></motion.div>
      </div>
    </div>
  );
}

/** Step 3: the map draws itself downward from "you are here" to the career goal, and the view follows it down. */
function MapScene({ p, plan }: { p: MotionValue<number>; plan: Plan }) {
  const model = useMemo(() => {
    const shown = new Set<string>();
    for (const t of plan.terms) for (const it of t.items)
      if (!it.option && !it.goalId.includes("@") && (it.importance === "must" || it.importance === "high")) shown.add(it.goalId);
    return mapModel(plan, outcomeText(SAMPLE_ANSWERS.trackId), shown);
  }, [plan]);
  const box = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  // Measured once laid out, and on resize (never per frame): how far the view travels to reach the bottom of the map.
  useLayoutEffect(() => {
    const measure = () => setTravel(Math.max(0, (inner.current?.offsetHeight ?? 0) - (box.current?.offsetHeight ?? 0)));
    measure();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    if (inner.current) ro?.observe(inner.current);
    if (box.current) ro?.observe(box.current);
    return () => ro?.disconnect();
  }, []);
  const reveal = useTransform(p, [0.08, 0.72], [4, 100]);
  const clipPath = useTransform(reveal, (r) => `inset(0 0 ${100 - r}% 0)`);
  const y = useTransform(p, [0.2, 0.74], [0, -travel]);
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden">
      <motion.div ref={inner} style={{ clipPath, y }} className="px-[clamp(8px,3vw,32px)] pt-6 pb-14 will-change-transform">
        <ConfluenceMap model={model} label="The sample plan as a confluence" />
      </motion.div>
      <Corners p={p} className="pointer-events-none absolute inset-x-[12%] bottom-12 h-[22%]"><span /></Corners>
    </div>
  );
}

/** Step 4: the first goal's steps, ticked one at a time, the progress bar filling in the done colour. */
function NextScene({ p, plan, term }: { p: MotionValue<number>; plan: Plan; term: PlanTerm }) {
  const ready = inWorkOrder(term.items.filter((i) => !i.option), plan.edges);
  const item = ready.find((i) => i.importance === "must") ?? ready[0];
  const how = howTo(item);
  const n = how.steps.length;
  const stage = useStage(p, how.steps.map((_, i) => 0.26 + (i * 0.44) / Math.max(1, n - 1)));
  const head = useIn(p, ARRIVE);
  return (
    <motion.div style={head} className="absolute inset-x-0 top-0 px-[clamp(12px,3vw,30px)] pt-5">
      <p className="fact">{term.label.toLowerCase()}</p>
      <p className="mt-1.5 font-display text-[clamp(1.4rem,1.1rem+1vw,1.75rem)] leading-[1.1] font-bold">{item.title}</p>
      <p className="mt-2"><PriorityTag it={item} /></p>
      <Corners p={p} className="mt-5">
        <div className="flex items-baseline justify-between gap-2 border-t-[3px] border-blue pt-2">
          <p className="font-display text-[1.3125rem] font-bold">What to do</p>
          <p className="fact">{stage} of {n} done</p>
        </div>
        <div className="mt-2 h-2 border-[1.5px] border-blue">
          <div aria-hidden="true" className="h-full origin-left bg-green transition-transform duration-[420ms] ease-confluence" style={{ transform: `scaleX(${stage / Math.max(1, n)})` }} />
        </div>
        <ol className="mt-2">
          {how.steps.map((s, i) => (
            <li key={s} className="grid grid-cols-[22px_1.25rem_1fr] items-start gap-2.5 border-b-[1.5px] border-blue py-2.5">
              <input type="checkbox" className="tick" checked={i < stage} readOnly tabIndex={-1} />
              <span className="fact">{i + 1}</span>
              <span className={i < stage ? "line-through decoration-green decoration-2" : ""}>{s}</span>
            </li>
          ))}
        </ol>
      </Corners>
    </motion.div>
  );
}

/** The end of the story: the spine reaches the ring, and the finished sample plan rises into view once; then the button. */
function Finale({ ref, sample, cta, reduced }: { ref: React.Ref<HTMLElement>; sample: SavedPlan; cta: ReactNode; reduced: boolean }) {
  const local = useRef<HTMLElement>(null);
  const near = useNear(local);
  const setRefs = (el: HTMLElement | null) => { local.current = el; if (typeof ref === "function") ref(el); else if (ref) (ref as React.RefObject<HTMLElement | null>).current = el; };
  return (
    <section ref={setRefs} aria-labelledby="story-end" className="relative flex gap-3 pb-12 min-[900px]:gap-8 min-[760px]:pb-[72px]">
      <div className="relative w-3.5 flex-none min-[900px]:w-5">
        {/* The last stretch of the spine draws once as the finale enters, then the ring: the logo's goal. */}
        <motion.span aria-hidden="true" initial={reduced ? false : { scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute top-0 left-1/2 h-12 w-[1.5px] origin-top -translate-x-1/2 bg-blue will-change-transform" />
        <motion.span aria-hidden="true" initial={reduced ? false : { scale: 0.6, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, delay: reduced ? 0 : 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute top-12 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-green bg-sage">
          <span aria-hidden="true" className="absolute inset-[4px] rounded-full bg-green" />
        </motion.span>
      </div>
      <div className="min-w-0 flex-1 pt-8">
        <p className="kicker">the result</p>
        <h3 id="story-end" tabIndex={-1} className="mt-3 text-[clamp(1.6rem,1.2rem+1.8vw,2.75rem)] leading-[1]">Your plan, start to finish</h3>
        <p className="mt-3 max-w-[36em]">Every semester to graduation, with the places to go, a map, resources and your major's courses. This one is the sample student's.</p>
        <p className="sr-only">Below is a picture of the sample student's finished plan, as it appears on the results page.</p>
        <motion.div aria-hidden="true" inert initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
          className="win pointer-events-none mt-8 h-[min(84svh,860px)] overflow-hidden select-none will-change-transform">
          <div className="win-bar win-bar--quiet"><span className="invisible">.</span></div>
          {near && <ResultsPage embedded frozen sample saved={sample} onChange={noop} onEdit={noop} />}
        </motion.div>
        <div className="mt-8">{cta}</div>
      </div>
    </section>
  );
}
