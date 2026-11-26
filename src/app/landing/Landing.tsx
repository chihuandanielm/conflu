import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import logoUrl from "../brand/conflu-logo.svg?url";
import { resources, tracks } from "../data/dataset.ts";
import requirementsFile from "../../../data/requirements.json";
import { toTop } from "../ui/scroll.ts";
import { Privacy } from "./Privacy.tsx";
import { createScene } from "./scene.ts";
import { Story } from "./story/Story.tsx";

const PAINTED_KEY = "cpm.landing.painted";
const EASE = [0.45, 0, 0.2, 1] as const;
/** Leaving: the words fade (0.35 s), then the next screen fades in (the landing and the questions share the bone paper). */
const WORDS_OUT_S = 0.35, HANDOVER_S = 0.15;
/** The first time the landing mounts in a visit it shows at once; coming back from the questions, it fades in. */
let firstMount = true;

const hasPainted = () => { try { return sessionStorage.getItem(PAINTED_KEY) === "1"; } catch { return false; } };

/**
 * The landing (docs/DESIGN_RESEARCH.md, direction A "Field guide"): a catalogue-style page on bone paper. A masthead with
 * the script logo and small type in the corners; the headline with "now." on the ochre "look here first" band; the
 * button; and the painted confluence in a window with crop marks and a ruler. Then the story of how it works, which
 * plays as the visitor scrolls (story/Story.tsx) and ends on a finished sample plan; the numbers behind it; a closing
 * button; the logo large; and the privacy and data note. Every way out runs the same exit: the words fade, the page
 * returns to the top while nothing shows, and the next screen fades in.
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
            <img src={logoUrl} alt="conflu" width={1940} height={1110} className="h-[46px] w-auto min-[760px]:h-[54px]" />
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

          {/* How it works: the story, played by scrolling, ending on the finished sample plan. */}
          <Story cta={cta(primary.label, primary.go)} />

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

          <img src={logoUrl} alt="" aria-hidden="true" width={1940} height={1110} className="mx-auto mt-12 block h-auto w-full max-w-[490px] min-[760px]:mt-16" />

          <Privacy />
        </div>
      </motion.div>
    </div>
  );
}
