import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import { createRiver, type Rect, type River, type SceneHints, type SceneName } from "./river.js";

/**
 * The one river for the whole session (design/RIVER.md §3). The canvas is mounted once, fixed behind every view, and
 * never unmounted; views move its camera with `useRiver()` instead of drawing their own. Before the canvas exists, or
 * where there is no real canvas (tests), every call is a harmless no-op.
 */
export interface RiverApi {
  goTo(name: SceneName, opt?: { ms?: number; along?: boolean }): Promise<void>;
  setScene(name: SceneName): void;
  setHints(h: SceneHints): void;
  setMasks(rects: Rect[], opt?: { fadeMs?: number }): void;
  celebrate(seconds?: number): void;
  pause(): void;
  resume(): void;
  /** The scene the camera is in (or moving to). */
  readonly scene: SceneName | null;
  readonly reducedMotion: boolean;
}

const Ctx = createContext<RiverApi | null>(null);

/** A real 2D canvas is needed; jsdom (unit tests) has none. */
const canDraw = () => typeof navigator !== "undefined" && !/jsdom/i.test(navigator.userAgent);

export function RiverProvider({ scene = "landing", children }: { scene?: SceneName; children: ReactNode }) {
  const river = useRef<River | null>(null);
  const target = useRef<SceneName | null>(null);

  // A callback ref runs as soon as the canvas is in the page, before any view's effects, so views can move the camera
  // on their first render. React 19 calls the returned function when the canvas leaves the page (only on app teardown).
  const attach = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || !canDraw() || river.current) return;
    const r = createRiver(canvas, { scene });
    river.current = r;
    target.current = scene;
    // Glyph widths are measured from the mono font; measure again once the self-hosted font has loaded.
    document.fonts?.ready.then(() => river.current?.resize()).catch(() => {});
    return () => { r.destroy(); if (river.current === r) river.current = null; };
  }, [scene]);

  const api = useMemo<RiverApi>(() => ({
    goTo: (name, opt) => { target.current = name; return river.current ? river.current.goTo(name, opt) : Promise.resolve(); },
    setScene: (name) => { target.current = name; river.current?.setScene(name); },
    setHints: (h) => river.current?.setHints(h),
    setMasks: (rects, opt) => river.current?.setMasks(rects, opt),
    celebrate: (s) => river.current?.celebrate(s),
    pause: () => river.current?.pause(),
    resume: () => river.current?.resume(),
    get scene() { return target.current; },
    get reducedMotion() { return river.current?.reducedMotion ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches); },
  }), []);

  return (
    <Ctx.Provider value={api}>
      <canvas ref={attach} aria-hidden="true" data-river="" className="pointer-events-none fixed inset-0 -z-10 block h-full w-full" />
      {children}
    </Ctx.Provider>
  );
}

/** Outside a provider (a component rendered on its own in a test), the river is simply not there. */
const NONE: RiverApi = {
  goTo: () => Promise.resolve(), setScene: () => {}, setHints: () => {}, setMasks: () => {}, celebrate: () => {}, pause: () => {}, resume: () => {},
  scene: null, reducedMotion: false,
};

export function useRiver(): RiverApi {
  return useContext(Ctx) ?? NONE;
}
