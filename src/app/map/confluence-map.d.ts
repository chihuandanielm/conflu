// Types for confluence-map.js (design/DESIGN.md §7.5). The implementation stays plain, dependency-free JavaScript.

export interface MapGoal { goalId: string; title: string; lane?: string; hours?: number; /** the time in words ("~2 h a week"); replaces the glyph and hours */ time?: string; gate?: boolean; done?: boolean; late?: boolean }
export interface MapTerm { code: string; label: string; items: MapGoal[] }
export interface MapModel { terms: MapTerm[]; outcome: string }
export interface MapOptions {
  width?: number; sides?: 1 | 2; fontSize?: number; maxPerTerm?: number; maxHeight?: number; maxBundle?: number; charW?: number;
  done?: Iterable<string>; sourceLabel?: string;
}
export interface MapStrand { id: string; gate: boolean; done: boolean; x: number; y: number; left: boolean; from: number; d: string }
export interface MapDot { id: string; x: number; y: number; r: number; gate: boolean; done: boolean }
export interface MapLabel {
  id: string; title: string; lines: string[]; meta: string; gate: boolean; done: boolean; late: boolean;
  align: "left" | "right"; x: number; y: number; w: number; h: number;
}
export interface MapTermOut { code: string; label: string; y: number; h: number; more: number; count: number }
export interface MapLayout {
  width: number; height: number; sides: 1 | 2; fontSize: number; lineHeight: number; metaSize: number; strandGap: number; cx: number;
  source: { x: number; y: number; r: number; label: string; textX: number; textY: number };
  own: { id: string; x: number; d: string };
  strands: MapStrand[]; dots: MapDot[]; labels: MapLabel[]; terms: MapTermOut[];
  mouth: { x0: number; x1: number; y: number; cx: number; dotY: number; r: number; lines: string[]; fs: number; textX: number; textY: number; align: "middle" | "left" };
  leftEdge: number; rightEdge: number; shown: number; total: number;
}

export function layoutConfluence(model: MapModel, opt?: MapOptions): MapLayout;
export function wrap(text: string, cpl: number, max?: number): string[];
export const LANE_GLYPH: Record<string, string>;
export const LANE_NAME: Record<string, string>;
export function mapSvg(L: MapLayout, opt?: { text?: boolean; palette?: Record<string, string>; display?: string; mono?: string; title?: string }): string;
