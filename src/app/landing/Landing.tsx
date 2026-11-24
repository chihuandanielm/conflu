import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { resources, tracks } from "../data/dataset.ts";
import requirementsFile from "../../../data/requirements.json";
import { ConfluenceMap } from "../map/ConfluenceMap.tsx";
import { mapModel } from "../map/facts.ts";
import { outcomeText } from "../results/summary.ts";
import { todayISO } from "../today.ts";
import { toTop } from "../ui/scroll.ts";
import type { Answers } from "../intake/model.ts";
import { ResultsPage } from "../results/ResultsPage.tsx";
import { createSaved, type SavedPlan } from "../state/plan.ts";
import { SAMPLE_ANSWERS } from "../state/sample.ts";
import { createScene } from "./scene.ts";

const PAINTED_KEY = "cpm.landing.painted";
const EASE = [0.45, 0, 0.2, 1] as const;
/** Leaving: the words fade (0.35 s), then the next screen fades in (the landing and the questions share the bone paper). */
const WORDS_OUT_S = 0.35, HANDOVER_S = 0.15;
/** The first time the landing mounts in a visit it shows at once; coming back from the questions, it fades in. */
let firstMount = true;

const hasPainted = () => { try { return sessionStorage.getItem(PAINTED_KEY) === "1"; } catch { return false; } };

/**
 * The landing's map: the sample student's plan as the confluence (design/DESIGN.md §7.5), each must-do and
 * high-priority goal a stream joining one river toward the career goal (yearly rounds such as the FAFSA left out, so no
 * goal repeats). A picture of the whole path, where the sample plan itself opens on this semester's steps.
 */
function sampleMap() {
  const plan = createSaved(SAMPLE_ANSWERS, todayISO()).plan;
  const shown = new Map<string, string>();
  for (const t of plan.terms) for (const it of t.items)
    if (!it.option && !it.goalId.includes("@") && (it.importance === "must" || it.importance === "high") && !shown.has(it.goalId)) shown.set(it.goalId, t.label);
  return { model: mapModel(plan, outcomeText(SAMPLE_ANSWERS.trackId), new Set(shown.keys())), termOf: (id: string) => shown.get(id) };
}

/**
 * The landing (docs/DESIGN_RESEARCH.md, direction A "Field guide"): a catalogue-style page on bone paper. A masthead with
 * small type in the corners; the headline with "this semester." on the ochre "look here first" band; stacked buttons
 * (build, see a sample plan); and the painted confluence in a window with crop marks and a ruler. "See a sample plan"
 * expands a full, working plan for a made-up student right under the hero (held in memory only; nothing is saved).
 * Then how it works, a real plan, the numbers behind it, and a closing button. Every way out runs the same exit: the words fade,
 * the page returns to the top while nothing shows, and the next screen fades in.
 */
export function Landing({ onStart, hasProgress, onResume, onStartOver, onContinuePlan, onEditSample }: {
  onStart: () => void; hasProgress: boolean; onResume: () => void; onStartOver: () => void; onContinuePlan?: () => void;
  /** The sample plan's "Edit answers": the review screen, filled in with the sample student's answers. */
  onEditSample?: (a: Answers) => void;
}) {
  const reduce = !!useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const h1 = useRef<HTMLHeadingElement>(null);
  const [first] = useState(() => { const f = firstMount; firstMount = false; return f; });
  const [paints] = useState(() => !reduce && !hasPainted());
  const [leaving, setLeaving] = useState(false);
  const leaveTimer = useRef<number[]>([]);
  const map = useMemo(sampleMap, []);
  // The sample plan, expanded in place. Built when opened, so it is for today's date; changes stay in memory.
  const [sample, setSample] = useState<SavedPlan | null>(null);
  const sampleRef = useRef<HTMLElement>(null);
  const scrollToSample = useRef(false);
  const toggleSample = () => {
    if (sample) { setSample(null); return; }
    scrollToSample.current = true;
    setSample(createSaved(SAMPLE_ANSWERS, todayISO()));
  };
  useEffect(() => {
    if (!sample || !scrollToSample.current || !sampleRef.current) return;
    scrollToSample.current = false;
    const el = sampleRef.current;
    // One frame later, once the plan is laid out: focus its title (for screen readers), then bring it into view. In this
    // order, because moving the focus cancels a scroll already under way.
    const raf = requestAnimationFrame(() => {
      el.querySelector<HTMLElement>("h2[tabindex='-1']")?.focus({ preventScroll: true });
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: reduce ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [sample, reduce]);

  useEffect(() => {
    if (!first) toTop(); // coming back from the questions
    h1.current?.focus({ preventScroll: true });
    // A real canvas is needed; jsdom (unit tests) has none.
    if (!canvas.current || /jsdom/i.test(navigator.userAgent)) return;
    const scene = createScene(canvas.current, { reducedMotion: reduce });
    return () => scene.destroy();
  }, [reduce]);
  useEffect(() => () => leaveTimer.current.forEach((t) => window.clearTimeout(t)), []);

  /** Leave the landing gently, then hand over. With reduced motion, at once. */
  const leave = (go: () => void) => () => {
    if (leaving) return;
    if (reduce) { toTop(); go(); return; }
    setLeaving(true);
    leaveTimer.current.push(window.setTimeout(toTop, WORDS_OUT_S * 1000));
    leaveTimer.current.push(window.setTimeout(go, (WORDS_OUT_S + HANDOVER_S) * 1000));
  };

  const primary = onContinuePlan ? { label: "Continue your plan", go: onContinuePlan }
    : hasProgress ? { label: "Continue where you left off", go: onResume } : { label: "Build my plan", go: onStart };
  /** The buttons: square, stacked, full width on a phone, with the arrow at the far end. */
  const cta = (label: string, go: () => void, kind: "solid" | "outline" = "solid") => (
    <button type="button" onClick={leave(go)}
      className={`flex min-h-[54px] w-full min-w-[260px] items-center justify-between gap-6 border-[1.5px] border-blue px-5 text-[1.125rem] transition-colors duration-[140ms] min-[520px]:w-auto
        ${kind === "solid" ? "bg-blue font-display font-bold text-sage hover:bg-sage hover:text-ink" : "bg-sage text-ink hover:bg-blue hover:text-sage"}`}>
      {label}<span aria-hidden="true" className="font-mono text-fact">-&gt;</span>
    </button>
  );

  const stats = [
    [resources.length, "checked resources"], [tracks.filter((t) => t.id !== "exploring").length, "career paths"],
    [(requirementsFile as { requirements: unknown[] }).requirements.length, "major course lists"], [0, "accounts or trackers"],
  ] as const;

  return (
    <div className="relative min-h-dvh">
      <motion.div initial={{ opacity: first || reduce ? 1 : 0 }} animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: reduce ? 0 : WORDS_OUT_S, delay: !leaving && !first && !reduce ? 0.3 : 0, ease: EASE }}
        inert={leaving}>
        <div className="mx-auto max-w-[1240px] px-5 min-[760px]:px-8">
          {/* Masthead: small type in the corners, a rule under it. */}
          <nav className="grid grid-cols-[1fr_auto] items-center gap-4 border-b-[1.5px] border-blue py-4 min-[900px]:grid-cols-[1fr_auto_1fr]">
            <span className="flex items-center gap-2.5 font-display text-[1.5rem] leading-none font-bold">
              <svg width="26" height="30" viewBox="0 0 44 52" aria-hidden="true">
                <path d="M7 3C7 15 22 17 22 29M22 3V29M37 3C37 15 22 17 22 29" fill="none" stroke="currentColor" strokeWidth="2.4" />
                <path d="M22 29V42" stroke="currentColor" strokeWidth="3" />
                <circle cx="22" cy="29" r="4" className="fill-green" /><circle cx="22" cy="46" r="3.6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              conflu
            </span>
            <span className="fact hidden min-[900px]:block">a career plan, one semester at a time</span>
            <span className="fact justify-self-end">no account needed</span>
          </nav>

          {/* The hero: words on the left, the painting in its window on the right; on a phone the words come first. */}
          <section className="grid items-center gap-10 py-10 min-[900px]:grid-cols-[5fr_6fr] min-[900px]:gap-14 min-[900px]:py-20">
            <div className={`relative z-[1] ${paints ? "landing-words" : ""}`}>
              <p className="kicker">for college students</p>
              <h1 ref={h1} tabIndex={-1} className="mt-5 text-[clamp(3rem,1.8rem+4.6vw,5.5rem)] leading-[0.9] tracking-[-0.01em] text-ink">
                Know what to do <span className="mt-[0.06em] inline-block bg-sand px-[0.12em] pb-[0.08em] leading-[0.92] text-ink">now.</span>
              </h1>
              <p className="mt-6 max-w-[30em]">Tell it your major, your year and your career goal. You get a plan for each semester, with proper resources and programs in about 3 minutes.</p>
              <div className="mt-8 flex flex-col items-stretch gap-2.5 min-[520px]:items-start">
                {cta(primary.label, primary.go)}
                <button type="button" onClick={toggleSample} aria-expanded={!!sample} aria-controls="sample-plan"
                  className="flex min-h-[54px] w-full min-w-[260px] items-center justify-between gap-6 border-[1.5px] border-blue bg-sage px-5 text-[1.125rem] text-ink transition-colors duration-[140ms] hover:bg-blue hover:text-sage min-[520px]:w-auto">
                  {sample ? "Hide the sample plan" : "See a sample plan"}<span aria-hidden="true" className="font-mono text-fact">{sample ? "-" : "+"}</span>
                </button>
                {(onContinuePlan || hasProgress) && (
                  <button type="button" onClick={leave(onStartOver)} className="btn btn--text -ml-2 mt-1 self-start">Start over</button>
                )}
              </div>
            </div>
            <figure className="relative m-0">
              {/* Drafting marks: two crop corners outside the window. */}
              <span aria-hidden="true" className="absolute -top-3 -left-3 h-4 w-4 border-t-[1.5px] border-l-[1.5px] border-blue max-[899px]:hidden" />
              <span aria-hidden="true" className="absolute -right-3 bottom-9 h-4 w-4 border-r-[1.5px] border-b-[1.5px] border-blue max-[899px]:hidden" />
              <div className="win">
                <div aria-hidden="true" className="win-bar win-bar--quiet"><span className="invisible">.</span></div>
                <div className="relative h-[300px] bg-umber min-[900px]:h-[430px]">
                  <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />
                </div>
              </div>
              <div aria-hidden="true" className="ruler mt-2.5" />
              <figcaption className="fact mt-1.5">A confluence of streams will carry you toward your goal</figcaption>
            </figure>
          </section>

          {/* The sample plan, expanded in place: the whole results page, working, for a made-up student. */}
          <AnimatePresence initial={false}>
            {sample && (
              <motion.section ref={sampleRef} id="sample-plan" aria-label="Sample plan" key="sample"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                className="-mx-5 scroll-mt-0 border-t-[1.5px] border-blue min-[760px]:-mx-8">
                <ResultsPage embedded sample saved={sample} onChange={setSample}
                  onEdit={() => onEditSample?.(sample.answers)} onStartOver={leave(onStart)} />
              </motion.section>
            )}
          </AnimatePresence>

          <section aria-labelledby="how-h" className="border-t-[1.5px] border-blue py-12 min-[760px]:py-[72px]">
            <h2 id="how-h" className="text-[2.625rem] leading-none min-[760px]:text-[3.5rem]">How it works</h2>
            <ol className="mt-9 grid grid-cols-1 border-[1.5px] border-blue min-[760px]:grid-cols-3">
              {[["Answer a few questions", "Major, year, campus, free hours."], ["Get it ranked", "By what recruiters in your field look for."],
                ["Do the next step", "Each goal says how long it takes and where to go."]].map(([t, d], i) => (
                <li key={t} className="border-blue p-7 max-[759px]:border-b-[1.5px] min-[760px]:border-r-[1.5px] last:border-0">
                  <span className="fact">step {i + 1}</span>
                  <h3 className="mt-4 text-[1.875rem] leading-[1.05]">{t}</h3>
                  <p className="mt-2.5">{d}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* The whole path as a map: the same sample student, drawn as the confluence. Any goal opens the sample plan. */}
          <section aria-labelledby="map-h" className="border-t-[1.5px] border-blue py-12 min-[760px]:py-[72px]">
            <h2 id="map-h" className="text-[2.625rem] leading-none min-[760px]:text-[3.5rem]">The whole path, as a map</h2>
            <p className="mt-4 max-w-[40em]">Each important goal is a stream that joins the river in the semester it starts. This is the sample student's plan; pick any goal to open it.</p>
            <div className="win mt-9">
              <div aria-hidden="true" className="win-bar win-bar--quiet"><span className="invisible">.</span></div>
              <div className="px-4 py-6 min-[760px]:px-8 min-[760px]:py-8">
                <ConfluenceMap model={map.model} label="A sample plan as a confluence: its important goals joining one river" termOf={map.termOf}
                  onOpen={() => { if (!sample) toggleSample(); else sampleRef.current && window.scrollTo({ top: sampleRef.current.getBoundingClientRect().top + window.scrollY, behavior: reduce ? "auto" : "smooth" }); }} />
              </div>
            </div>
          </section>

          <section aria-label="The numbers behind it" className="grid grid-cols-2 border-t-[1.5px] border-blue min-[760px]:grid-cols-4">
            {stats.map(([n, label], i) => (
              <p key={label} className={`border-blue px-5 py-9 min-[760px]:px-7 ${i % 2 === 0 ? "border-r" : "max-[759px]:border-r-0 min-[760px]:border-r"} max-[759px]:border-b min-[760px]:last:border-r-0`}>
                <span className="block font-display text-[3.25rem] leading-none font-bold min-[760px]:text-[4.5rem]">{n}</span>
                <span className="mt-2 block">{label}</span>
              </p>
            ))}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-6 border-[1.5px] border-blue bg-sand px-5 py-10 text-ink min-[760px]:px-14 min-[760px]:py-16">
            <h2 className="text-[2.75rem] leading-none text-ink min-[760px]:text-[4rem]">Start your plan.</h2>
            {cta(primary.label, primary.go)}
          </section>

          <p aria-hidden="true" className="overflow-hidden pt-10 font-display text-[clamp(120px,23vw,320px)] leading-[0.8] font-bold whitespace-nowrap text-ink min-[760px]:pt-14 pb-2">conflu</p>
        </div>
      </motion.div>
    </div>
  );
}
