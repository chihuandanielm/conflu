// Positions every chart element from the plan's terms (columns) and lanes (rows). No auto-layout library:
// the grid is the meaning, so positions come straight from term index and lane order (ALGORITHM.md §7).
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { LANES, type Lane } from "../results/lanes.ts";

export const LABEL_W = 152;
export const COL_W = 236;
export const NODE_W = 212;
export const NODE_H = 76;
export const GAP = 12;
export const HEADER_H = 64;
export const BAND_H = NODE_H + GAP * 2;
const BLOCK_HOURS = 300; // full-time commitments (internships, co-ops) render as a full-width bar in their column

export interface ItemNodeData { item: PlanItem; term: PlanTerm; col: number; [k: string]: unknown }
export interface ChartNode { id: string; type: "item" | "block" | "lane" | "column"; x: number; y: number; w: number; h: number; data: Record<string, unknown> }
export interface ChartEdge { id: string; source: string; target: string; kind: "prereq" | "continues"; from: string; to: string }
export interface ChartLayout { nodes: ChartNode[]; edges: ChartEdge[]; width: number; height: number; lanes: Lane[]; columnIds: string[] }

export const nodeId = (term: string, goalId: string) => `${term}:${goalId}`;
export const isBlock = (it: PlanItem, _t: PlanTerm) => it.hours >= BLOCK_HOURS;

export function layoutPlan(plan: Plan, hiddenLanes: ReadonlySet<Lane> = new Set()): ChartLayout {
  const terms = plan.terms;
  const lanes = LANES.filter((l) => !hiddenLanes.has(l) && terms.some((t) => t.items.some((it) => it.lane === l && !isBlock(it, t))));
  const hasBlocks = terms.some((t) => t.items.some((it) => isBlock(it, t)));
  const width = LABEL_W + terms.length * COL_W;
  const nodes: ChartNode[] = [];

  // Rows: an optional full-time band, then one row per lane sized to its busiest term.
  let y = HEADER_H;
  const blockY = y;
  if (hasBlocks) y += BAND_H;
  const rowTop = new Map<Lane, number>();
  for (const lane of lanes) {
    const most = Math.max(1, ...terms.map((t) => t.items.filter((it) => it.lane === lane && !isBlock(it, t)).length));
    const h = most * (NODE_H + GAP) + GAP;
    rowTop.set(lane, y);
    nodes.push({ id: `lane:${lane}`, type: "lane", x: 0, y, w: width, h, data: { lane } });
    y += h;
  }
  if (hasBlocks) nodes.push({ id: "lane:full-time", type: "lane", x: 0, y: blockY, w: width, h: BAND_H, data: { lane: "full-time" } });
  const height = y;

  const columnIds: string[] = [];
  terms.forEach((t, col) => {
    const x = LABEL_W + col * COL_W;
    const id = `col:${t.code}`;
    columnIds.push(id);
    nodes.push({ id, type: "column", x, y: 0, w: COL_W, h: height, data: { term: t, col, current: col === 0 } });
    const perLane = new Map<Lane, number>();
    for (const it of t.items) {
      if (isBlock(it, t)) {
        nodes.push({ id: nodeId(t.code, it.goalId), type: "block", x: x + (COL_W - NODE_W) / 2, y: blockY + GAP, w: NODE_W, h: NODE_H, data: { item: it, term: t, col } });
        continue;
      }
      const top = rowTop.get(it.lane);
      if (top === undefined) continue; // lane filtered out
      const k = perLane.get(it.lane) ?? 0;
      perLane.set(it.lane, k + 1);
      nodes.push({ id: nodeId(t.code, it.goalId), type: "item", x: x + (COL_W - NODE_W) / 2, y: top + GAP + k * (NODE_H + GAP), w: NODE_W, h: NODE_H, data: { item: it, term: t, col } });
    }
  });

  // Edges: prerequisite arrows (last placement of the prerequisite → first placement of the dependent),
  // and dotted continuation lines between consecutive placements of a goal that spans terms.
  const placed = new Map<string, string[]>(); // goalId -> node ids in term order
  for (const n of nodes) if (n.type === "item" || n.type === "block") {
    const g = (n.data as ItemNodeData).item.goalId;
    placed.set(g, [...(placed.get(g) ?? []), n.id]);
  }
  const edges: ChartEdge[] = [];
  for (const e of plan.edges) {
    const from = placed.get(e.from), to = placed.get(e.to);
    if (!from || !to) continue;
    edges.push({ id: `p:${e.from}->${e.to}`, source: from[from.length - 1], target: to[0], kind: "prereq", from: e.from, to: e.to });
  }
  for (const [g, ids] of placed) for (let i = 1; i < ids.length; i++) {
    edges.push({ id: `c:${g}:${i}`, source: ids[i - 1], target: ids[i], kind: "continues", from: g, to: g });
  }
  return { nodes, edges, width, height, lanes, columnIds };
}

/** Every goal connected to `goalId` through prerequisites, in both directions, including itself. */
export function related(plan: Plan, goalId: string): Set<string> {
  const up = new Map<string, string[]>(), down = new Map<string, string[]>();
  for (const e of plan.edges) {
    up.set(e.to, [...(up.get(e.to) ?? []), e.from]);
    down.set(e.from, [...(down.get(e.from) ?? []), e.to]);
  }
  const out = new Set([goalId]);
  for (const graph of [up, down]) {
    const stack = [goalId];
    while (stack.length) for (const n of graph.get(stack.pop()!) ?? []) if (!out.has(n)) { out.add(n); stack.push(n); }
  }
  return out;
}

/** Node ids for the "current term plus the next two" opening view. */
export function focusIds(layout: ChartLayout, columns = 3): string[] {
  const keep = new Set(layout.columnIds.slice(0, columns));
  return layout.nodes.filter((n) => n.type === "column" && keep.has(n.id)).map((n) => n.id);
}
