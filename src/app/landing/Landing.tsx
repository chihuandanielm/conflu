import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { buildPlan } from "../../engine/engine.ts";
import { dataset, resources, tracks } from "../data/dataset.ts";
import requirementsFile from "../../../data/requirements.json";
import { byImportance } from "../results/EditMap.tsx";
import { outcomeText } from "../results/summary.ts";
import { todayISO } from "../today.ts";
import { toTop } from "../ui/scroll.ts";
import { createScene } from "./scene.ts";

const PAINTED_KEY = "cpm.landing.painted";
const EASE = [0.45, 0, 0.2, 1] as const;
/** Leaving: the words fade (0.35 s), then the navy fades to the sage of the questions (1.1 s). */
const WORDS_OUT_S = 0.35, NAVY_OUT_S = 1.1;
/** The first time the landing mounts in a visit it starts navy; coming back from the questions, the navy fades in. */
let firstMount = true;

const hasPainted = () => { try { return sessionStorage.getItem(PAINTED_KEY) === "1"; } catch { return false; } };

/** The example on the landing: a real plan from the engine, for a computer science sophomore on the software track. */
function examplePlan() {
  const plan = buildPlan({ status: "college-student", majorId: "computer-science", year: 2, semester: 1, trackId: "software-engineering",
    horizon: "graduation", today: todayISO(), weeklyHours: 8, school: "rutgers-nb", summer: "full", location: "nj" }, dataset);
  return plan.terms.filter((t) => t.items.length).slice(0, 5).map((t) => ({
    label: t.label, items: byImportance(t.items.filter((i) => !i.option)).slice(0, 3),
  }));
}

/**
 * The landing (docs/LANDING_REDESIGN.md): a navy page with the painted confluence behind the headline, then how it
 * works, a real plan, the numbers behind it, and a closing button. Every way out (start, continue, start over) runs the
 * same exit: the words fade, the page returns to the top while nothing shows, and the navy fades into the sage of the
 * next screen, so the colour never changes all at once.
 */
export function Landing({ onStart, hasProgress, onResume, onStartOver, onContinuePlan }: {
  onStart: () => void; hasProgress: boolean; onResume: () => void; onStartOver: () => void; onContinuePlan?: () => void;
}) {
  const reduce = !!useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const h1 = useRef<HTMLHeadingElement>(null);
  const [first] = useState(() => { const f = firstMount; firstMount = false; return f; });
  const [paints] = useState(() => !reduce && !hasPainted());
  const [leaving, setLeaving] = useState(false);
  const leaveTimer = useRef<number[]>([]);
  const example = useMemo(examplePlan, []);
  const outcome = outcomeText("software-engineering");

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
    leaveTimer.current.push(window.setTimeout(go, (WORDS_OUT_S + NAVY_OUT_S) * 1000));
  };

  const primary = onContinuePlan ? { label: "Continue your plan", go: onContinuePlan }
    : hasProgress ? { label: "Continue where you left off", go: onResume } : { label: "Build my plan", go: onStart };
  const cta = (label: string, go: () => void, dark = false) => (
    <button type="button" onClick={leave(go)}
      className={`inline-flex min-h-[52px] items-center gap-2.5 px-6 font-display text-[1.125rem] font-bold transition-colors duration-[140ms]
        ${dark ? "bg-ink text-sand hover:bg-navy" : "bg-sand text-ink hover:bg-sage"}`}>
      {label}<span aria-hidden="true" className="font-mono text-fact">-&gt;</span>
    </button>
  );

  const stats = [
    [resources.length, "checked resources"], [tracks.filter((t) => t.id !== "exploring").length, "career paths"],
    [(requirementsFile as { requirements: unknown[] }).requirements.length, "major course lists"], [0, "accounts or trackers"],
  ] as const;

  return (
    <div className="relative min-h-dvh text-sage">
      {/* The navy ground. It fades out on leaving (to the sage underneath), and in when coming back. */}
      <motion.div aria-hidden="true" className="fixed inset-0 -z-10 bg-navy"
        initial={{ opacity: first || reduce ? 1 : 0 }} animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: reduce ? 0 : leaving ? NAVY_OUT_S : 0.9, delay: leaving ? WORDS_OUT_S : 0, ease: EASE }} />
      <motion.div initial={{ opacity: first || reduce ? 1 : 0 }} animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: reduce ? 0 : WORDS_OUT_S, delay: !leaving && !first && !reduce ? 0.8 : 0, ease: EASE }}
        inert={leaving}>
        <div className="mx-auto max-w-[1160px] border-x border-blue">
          <nav className="flex items-center px-5 py-4 min-[760px]:px-14">
            <span className="flex items-center gap-2.5 font-display text-[1.625rem] leading-none font-bold">
              <svg width="30" height="34" viewBox="0 0 44 52" aria-hidden="true">
                <path d="M7 3C7 15 22 17 22 29M22 3V29M37 3C37 15 22 17 22 29" fill="none" stroke="currentColor" strokeWidth="2.4" />
                <path d="M22 29V42" stroke="currentColor" strokeWidth="3" />
                <circle cx="22" cy="29" r="4" className="fill-green" /><circle cx="22" cy="46" r="3.6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              conflu
            </span>
          </nav>

          {/* The painted confluence, with the headline on its dark sky. */}
          <section className="relative min-h-[760px] overflow-hidden border-t border-blue min-[760px]:min-h-[880px]">
            <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />
            <div className={`relative max-w-[940px] px-5 pt-11 min-[760px]:px-14 min-[760px]:pt-[72px] ${paints ? "landing-words" : ""}`}>
              <h1 ref={h1} tabIndex={-1} className="text-[3.375rem] leading-[0.95] text-sage min-[760px]:text-[5.25rem]">
                Know what to do <span className="text-sand">this semester.</span>
              </h1>
              <p className="mt-6 text-[1.1875rem]">A semester-by-semester plan for the job you want. Free, about 3 minutes, no account.</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {cta(primary.label, primary.go)}
                {(onContinuePlan || hasProgress) && (
                  <button type="button" onClick={leave(onStartOver)} className="min-h-[52px] border-[1.5px] border-sage px-5 text-sage transition-colors duration-[140ms] hover:bg-sage hover:text-ink">
                    Start over
                  </button>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="how-h" className="border-t border-blue px-5 py-12 min-[760px]:px-14 min-[760px]:py-[72px]">
            <h2 id="how-h" className="text-[2.625rem] leading-none text-sage min-[760px]:text-[3.5rem]">How it works</h2>
            <ol className="mt-9 grid grid-cols-1 border border-blue min-[760px]:grid-cols-3">
              {[["Answer a few questions", "Major, year, campus, free hours."], ["Get it ranked", "By what recruiters in your field look for."],
                ["Do the next step", "Each goal says how long it takes and where to go."]].map(([t, d], i) => (
                <li key={t} className="border-blue p-7 max-[759px]:border-b min-[760px]:border-r last:border-0">
                  <span className="font-mono text-fact text-sand">0{i + 1}</span>
                  <h3 className="mt-4 text-[1.875rem] leading-[1.05] text-sage">{t}</h3>
                  <p className="mt-2.5">{d}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="real-h" className="border-t border-blue px-5 py-12 min-[760px]:px-14 min-[760px]:py-[72px]">
            <h2 id="real-h" className="text-[2.625rem] leading-none text-sage min-[760px]:text-[3.5rem]">A real plan</h2>
            <div className="mt-9 bg-sage px-5 pt-2 pb-6 text-ink min-[760px]:px-7">
              <p className="flex flex-wrap justify-between gap-x-4 py-3.5 font-mono text-fact">
                <span>computer science · year 2 · rutgers–new brunswick</span><span>software engineering</span>
              </p>
              <ol>
                {example.map((t, i) => (
                  <li key={t.label} className={`grid grid-cols-1 items-baseline gap-2 py-3 min-[760px]:grid-cols-[150px_1fr] min-[760px]:gap-4 ${i === 0 ? "border-t-[3px]" : "border-t-[1.5px]"} border-blue`}>
                    <p className="label text-[1.125rem] text-blue">{t.label}</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {t.items.map((it) => (
                        <li key={it.goalId} className={`border-[1.5px] border-blue px-2 py-0.5 text-small ${it.importance === "must" || it.gate ? "bg-blue text-sage" : "text-blue"}`}>{it.title}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
              <p className="mt-4 flex items-center gap-3 font-display text-[1.375rem] font-bold">
                <span aria-hidden="true" className="dot dot--done h-3.5 w-3.5" />{outcome}
              </p>
            </div>
          </section>

          <section aria-label="The numbers behind it" className="grid grid-cols-2 border-t border-blue min-[760px]:grid-cols-4">
            {stats.map(([n, label], i) => (
              <p key={label} className={`border-blue px-5 py-9 min-[760px]:px-7 ${i % 2 === 0 ? "border-r" : "max-[759px]:border-r-0 min-[760px]:border-r"} max-[759px]:border-b min-[760px]:last:border-r-0`}>
                <span className="block font-display text-[3.25rem] leading-none font-bold text-sand min-[760px]:text-[4.5rem]">{n}</span>
                <span className="mt-2 block">{label}</span>
              </p>
            ))}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-6 border-t border-blue bg-sand px-5 py-10 text-ink min-[760px]:px-14 min-[760px]:py-16">
            <h2 className="text-[2.75rem] leading-none text-ink min-[760px]:text-[4rem]">Start your plan.</h2>
            {cta(primary.label, primary.go, true)}
          </section>

          <p aria-hidden="true" className="overflow-hidden border-t border-blue px-4 pt-8 font-display text-[clamp(120px,23vw,320px)] leading-[0.8] font-bold whitespace-nowrap text-sage min-[760px]:px-10 min-[760px]:pt-11">conflu</p>
          <footer className="border-t border-blue px-5 pt-4 pb-6 font-mono text-fact min-[760px]:px-14">nothing leaves your browser</footer>
        </div>
      </motion.div>
    </div>
  );
}
