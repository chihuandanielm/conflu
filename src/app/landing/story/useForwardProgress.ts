import { useEffect, useRef, useState, type RefObject } from "react";
import { useMotionValue, useMotionValueEvent, useScroll, type MotionValue } from "motion/react";

/**
 * How far the visitor has scrolled through an element (the story's spine), 0 to 1, never going back: scrolling up leaves
 * it where it was, so nothing that has appeared ever disappears. The value is a motion value, so what it moves updates
 * on the compositor without a React render per frame. With reduced motion it is 1 from the start.
 */
export function useForwardProgress(target: RefObject<HTMLElement | null>, reduced: boolean,
  offset: NonNullable<Parameters<typeof useScroll>[0]>["offset"] = ["start start", "end end"]): MotionValue<number> {
  const { scrollYProgress } = useScroll({ target, offset });
  const p = useMotionValue(reduced ? 1 : 0);
  useEffect(() => { if (reduced) p.set(1); }, [reduced, p]);
  useMotionValueEvent(scrollYProgress, "change", (v) => { if (!reduced && v > p.get()) p.set(Math.min(1, v)); });
  return p;
}

/**
 * True once the element's top has come 40% of the way up the viewport, and true from then on: the moment a step's
 * scene plays. It plays on a clock from there, so it never depends on how fast anyone scrolls, and it never
 * replays or rewinds. With reduced motion it is true from the start (every scene shows finished).
 */
export function usePlay(target: RefObject<HTMLElement | null>, reduced: boolean): boolean {
  const [play, setPlay] = useState(reduced);
  useEffect(() => {
    if (reduced) { setPlay(true); return; }
    const el = target.current;
    if (!el || typeof IntersectionObserver !== "function") { setPlay(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setPlay(true); io.disconnect(); } }, { rootMargin: "0px 0px -40% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [target, reduced]);
  return play;
}

/**
 * A scene's beats, in milliseconds after it starts playing: how many have passed. For the things that change state
 * (an answer picked, a step ticked) rather than move. Never goes back. With reduced motion every beat has passed.
 */
export function useBeats(play: boolean, reduced: boolean, at: number[]): number {
  const [n, setN] = useState(reduced ? at.length : 0);
  const key = at.join(",");
  useEffect(() => {
    if (!play) return;
    if (reduced) { setN(at.length); return; }
    const timers = at.map((ms, i) => setTimeout(() => setN((old) => Math.max(old, i + 1)), ms));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, reduced, key]);
  return n;
}

/**
 * Screens waiting to mount in idle time, one per idle period, in page order. Mounting a frozen screen (the map, the whole
 * results page) is one long task, so it's done while the visitor is still reading the hero, not in the middle of a scroll.
 */
const idleQueue: (() => void)[] = [];
let idleScheduled = false;
function pumpIdle() {
  if (idleScheduled || !idleQueue.length) return;
  idleScheduled = true;
  const run = () => { idleScheduled = false; idleQueue.shift()?.(); pumpIdle(); };
  if (typeof requestIdleCallback === "function") requestIdleCallback(run);
  else setTimeout(run, 120);
}

/**
 * True once the element's screen should be mounted, and true from then on: in idle time after the page loads, or as soon
 * as it comes within a screen of the viewport, whichever is first.
 */
export function useNear(target: RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    const el = target.current;
    if (!el || done.current) return;
    let live = true;
    const mount = () => { if (live && !done.current) { done.current = true; setNear(true); } };
    idleQueue.push(mount); pumpIdle();
    if (typeof IntersectionObserver !== "function") return () => { live = false; };
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { mount(); io.disconnect(); } }, { rootMargin: "100% 0px" });
    io.observe(el);
    return () => { live = false; io.disconnect(); };
  }, [target]);
  return near;
}
