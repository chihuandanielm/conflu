import { useEffect, useRef, useState, type RefObject } from "react";
import { useMotionValue, useMotionValueEvent, useScroll, type MotionValue } from "motion/react";

/**
 * How far a story step has played, 0 to 1, driven by scrolling down through its section and never going back: scrolling
 * up leaves it where it was, so nothing that has appeared ever disappears. The value is a motion value, so the pieces
 * it moves update on the compositor (transforms, opacity, clip-path) without a React render per frame. With reduced
 * motion it is 1 from the start: every step shows finished, nothing moves.
 */
export function useForwardProgress(target: RefObject<HTMLElement | null>, reduced: boolean): MotionValue<number> {
  const { scrollYProgress } = useScroll({ target, offset: ["start start", "end end"] });
  const p = useMotionValue(reduced ? 1 : 0);
  useEffect(() => { if (reduced) p.set(1); }, [reduced, p]);
  useMotionValueEvent(scrollYProgress, "change", (v) => { if (!reduced && v > p.get()) p.set(Math.min(1, v)); });
  return p;
}

/** A discrete stage of a step (for things that change state rather than move): the highest threshold `p` has passed. */
export function useStage(p: MotionValue<number>, thresholds: number[]): number {
  const [stage, setStage] = useState(() => thresholds.filter((t) => p.get() >= t).length);
  useMotionValueEvent(p, "change", (v) => {
    const s = thresholds.filter((t) => v >= t).length;
    setStage((old) => (s > old ? s : old));
  });
  return stage;
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
