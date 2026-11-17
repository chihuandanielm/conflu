// Types for river.js (the ASCII river, design/RIVER.md). The implementation stays plain, dependency-free JavaScript.

export type SceneName = "low" | "landing" | "ask" | "results" | "banner";
export interface SceneHints { sky?: number }
export interface Camera { tx: number; ty: number; heading: number; pitch: number; zoom: number; ax: number; ay: number }
export type Scene = (W: number, H: number, hints: SceneHints) => Camera;
export interface Rect { x: number; y: number; w: number; h: number }
/** A water cell, as `waterInk` reads it. */
export interface WaterCell { s: number; cross: number; edge: number; ori: number; fog: number; thin: number; fl: number; ch?: string }
export interface RiverStats { frames: number; slow: number; worstMs: number; avgMs: number; cells: number; quality: number }

export interface River {
  setScene(name: SceneName): void;
  goTo(name: SceneName, opt?: { ms?: number; along?: boolean }): Promise<void>;
  setMasks(rects: Rect[], opt?: { fadeMs?: number }): void;
  /** Draw only the band from the top down to `bottom` px (an opaque page covers the rest); null for the whole screen. */
  setClip(bottom: number | null): void;
  setHints(h: SceneHints): void;
  setCurrent(v: number): void;
  celebrate(seconds?: number): void;
  pause(): void;
  resume(): void;
  readonly scene: SceneName;
  readonly moving: boolean;
  readonly reducedMotion: boolean;
  readonly stats: RiverStats;
  resetStats(): void;
  resize(): void;
  destroy(): void;
}

export const PALETTE: { sage: string; blue: string; green: string; sand: string };
export const SCENES: Record<SceneName, Scene>;
export const WATER_RAMP: string[][];
export function hash(a: number, b?: number, c?: number): number;
export function buildWorld(aspect?: number): unknown;
export function makeView(world: unknown): unknown;
export function waterInk(c: WaterCell, t: number): number;
export function waterGlyph(c: WaterCell, t: number): string;
export function asciiFrame(scene: SceneName | Scene, cols: number, rows: number,
  opt?: { cell?: [number, number]; t?: number; aspect?: number; hints?: SceneHints }): { blue: string; sand: string }[];
export function createRiver(canvas: HTMLCanvasElement, opt?: { font?: string; scene?: SceneName; still?: boolean; now?: () => number }): River;
