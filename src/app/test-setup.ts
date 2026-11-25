import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion";
import { afterEach } from "vitest";

// Animations can't complete under fake timers in jsdom; tests check behavior, not motion.
MotionGlobalConfig.skipAnimations = true;
afterEach(() => cleanup());

// jsdom has no IntersectionObserver. This one reports every element as in view at once, so whileInView animations and
// the landing story's just-in-time screens mount straight away.
if (typeof globalThis.IntersectionObserver !== "function") {
  globalThis.IntersectionObserver = class {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(el: Element) { this.cb([{ isIntersecting: true, target: el, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    unobserve() {} disconnect() {} takeRecords() { return []; }
    root = null; rootMargin = ""; thresholds = [];
  } as unknown as typeof IntersectionObserver;
}
