import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button.tsx";
import { useRiver } from "../river/RiverProvider.tsx";

const HOLD_MS = 2300, RISE_MS = 2800, RISE_SHORT_MS = 1200;
/** The words fade in during the last second of the rise. */
const WORDS_AT = { full: 1700, short: 400 };

/**
 * The landing (design/DESIGN.md §7.1, words from design/preview/site.html). First visit: the camera starts low over
 * the water, holds, then rises and the tributaries open up; the words fade in near the end, and the river dissolves out
 * from under them. "Skip intro" jumps to the short rise. A returning visitor gets the short version with their own
 * buttons. With reduced motion the landing is one still frame and the words are there at once.
 */
export function Intro({ onStart, hasProgress, onResume, onStartOver, onContinuePlan }: {
  onStart: () => void; hasProgress: boolean; onResume: () => void; onStartOver: () => void; onContinuePlan?: () => void;
}) {
  const river = useRiver();
  const hero = useRef<HTMLDivElement>(null);
  const h1 = useRef<HTMLHeadingElement>(null);
  const timers = useRef<number[]>([]);
  const [shown, setShown] = useState(false);
  const [skippable, setSkippable] = useState(false);

  const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  /** Keep the river clear of the words: horizon below them on narrow screens, and a dissolve under them on wide ones. */
  const frame = useCallback((fadeMs = 0) => {
    const r = hero.current?.getBoundingClientRect();
    if (!r) return;
    river.setHints({ sky: r.bottom });
    river.setMasks([{ x: r.left - 12, y: r.top - 12, w: r.width + 24, h: r.height + 24 }], { fadeMs });
  }, [river]);

  const rise = useCallback((short: boolean) => {
    clear();
    setSkippable(false);
    frame(1400);
    void river.goTo("landing", { ms: short ? RISE_SHORT_MS : RISE_MS });
    later(short ? WORDS_AT.short : WORDS_AT.full, () => setShown(true));
  }, [frame, river]);

  useEffect(() => {
    h1.current?.focus({ preventScroll: true });
    if (river.reducedMotion) { frame(); river.setScene("landing"); setShown(true); return; }
    river.resume();
    // The long version only on a fresh arrival (the camera is still low over the water) by someone new.
    const returning = hasProgress || !!onContinuePlan;
    if (river.scene === "low" && !returning) { setSkippable(true); later(HOLD_MS, () => rise(false)); }
    else rise(true);
    return clear;
    // Runs once per visit to the landing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-frame when the window changes size (the words may wrap differently).
  useEffect(() => {
    if (!shown) return;
    const on = () => frame();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [shown, frame]);

  return (
    <main className="min-h-dvh">
      {skippable && (
        <button type="button" onClick={() => rise(true)}
          className="fixed top-3 right-3 z-10 min-h-12 bg-sage px-2.5 underline underline-offset-[3px]">
          Skip intro
        </button>
      )}
      <div ref={hero}
        className={`max-w-[600px] px-5 pt-[clamp(24px,6vh,56px)] transition-opacity duration-[520ms] ease-confluence ml-[max(0px,calc((100vw-1040px)/2))] ${shown ? "opacity-100" : "opacity-0"}`}>
        <p className="text-small">Career Pathway Mapper</p>
        <h1 ref={h1} tabIndex={-1} className="mt-2.5 text-hero">Many streams, one plan.</h1>
        <p className="mt-4 max-w-[34em]">
          Tell it your major, your year, and what you've already done. It lays out what to do each semester to get where you want to go, with the Rutgers, New Jersey, and national programs you can use.
        </p>
        <p className="mt-2.5 max-w-[36em] text-small">
          It takes about 3 minutes. There's no account, and your answers stay in this browser. What you get is a general trajectory, not a blueprint.
        </p>
        <div className="mt-[22px] flex flex-col items-start gap-2.5">
          {onContinuePlan ? (
            <>
              <Button onClick={onContinuePlan} className="min-h-[54px] min-w-[200px] text-lead">Continue your plan</Button>
              <Button variant="outline" onClick={onStartOver}>Start over</Button>
            </>
          ) : hasProgress ? (
            <>
              <Button onClick={onResume} className="min-h-[54px] min-w-[200px] text-lead">Continue where you left off</Button>
              <Button variant="outline" onClick={onStartOver}>Start over</Button>
            </>
          ) : (
            <Button onClick={onStart} className="min-h-[54px] min-w-[200px] text-lead">Start</Button>
          )}
        </div>
      </div>
    </main>
  );
}
