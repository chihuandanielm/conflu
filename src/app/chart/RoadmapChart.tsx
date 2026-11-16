// Desktop roadmap: terms as columns, lanes as rows, goals as cards, prerequisites as arrows.
// Loaded lazily so phones (which get the timeline) never download React Flow.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkerType, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { Maximize2, Minus, Plus, Scan } from "lucide-react";
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { LANE_LABEL, LANES, type Lane } from "../results/lanes.ts";
import { COL_W, LABEL_W, layoutPlan, related, type ItemNodeData } from "./layout.ts";
import { nodeTypes, type ItemData } from "./nodes.tsx";

export interface RoadmapChartProps {
  plan: Plan; changed: Set<string>; selectedGoal: string | null; onOpen: (it: PlanItem, t: PlanTerm) => void;
}

function Chart({ plan, changed, selectedGoal, onOpen }: RoadmapChartProps) {
  const [hiddenLanes, setHiddenLanes] = useState<Set<Lane>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const rf = useReactFlow();
  const box = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => layoutPlan(plan, hiddenLanes), [plan, hiddenLanes]);
  const presentLanes = useMemo(() => LANES.filter((l) => plan.terms.some((t) => t.items.some((it) => it.lane === l))), [plan]);
  const focus = hovered ?? selectedGoal;
  const lit = useMemo(() => (focus ? related(plan, focus) : null), [plan, focus]);

  /** Keyboard users: bring a focused card into view if it's off screen. */
  const onFocusCard = useCallback((id: string) => {
    const n = rf.getNode(id); const el = box.current;
    if (!n || !el) return;
    const { x, y, zoom } = rf.getViewport();
    const left = n.position.x * zoom + x, top = n.position.y * zoom + y, w = (n.width ?? 0) * zoom, h = (n.height ?? 0) * zoom;
    if (left < 0 || top < 0 || left + w > el.clientWidth || top + h > el.clientHeight) {
      void rf.setCenter(n.position.x + (n.width ?? 0) / 2, n.position.y + (n.height ?? 0) / 2, { zoom, duration: 150 });
    }
  }, [rf]);

  const nodes: Node[] = useMemo(() => layout.nodes.map((n) => {
    const base = { id: n.id, type: n.type, position: { x: n.x, y: n.y }, width: n.w, height: n.h, draggable: false, selectable: false, focusable: false };
    if (n.type === "item" || n.type === "block") {
      const d = n.data as ItemNodeData;
      const data: ItemData = { ...d, dim: !!lit && !lit.has(d.item.goalId), changed: changed.has(d.item.goalId), onOpen, onHover: setHovered, onFocusCard };
      // React Flow disables pointer events on non-selectable nodes; goal cards need them for hover and click.
      return { ...base, data, zIndex: 2, style: { pointerEvents: "all" as const } };
    }
    return { ...base, data: n.data, zIndex: n.type === "lane" ? 0 : 1 };
  }), [layout, lit, changed, onOpen, onFocusCard]);

  const edges: Edge[] = useMemo(() => layout.edges.map((e) => {
    const on = !lit || (lit.has(e.from) && lit.has(e.to));
    const stroke = lit && on ? "var(--blue)" : "var(--border-strong)";
    return e.kind === "prereq"
      ? { id: e.id, source: e.source, target: e.target, type: "smoothstep", zIndex: 1, focusable: false,
          style: { stroke, strokeWidth: lit && on ? 1.5 : 1, opacity: on ? 1 : 0.15 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: lit && on ? "#1f5f99" : "#c9d3dd" } }
      : { id: e.id, source: e.source, target: e.target, type: "straight", zIndex: 1, focusable: false,
          style: { stroke: "var(--muted)", strokeWidth: 1, strokeDasharray: "3 4", opacity: on ? 0.9 : 0.15 } };
  }), [layout, lit]);

  /**
   * Fit by width, aligned to the top: the opening view shows the current term plus the next two at a readable size;
   * the full view shows every term. Taller plans pan down.
   */
  const fit = useCallback((all: boolean, duration = 250) => {
    const width = box.current?.clientWidth ?? 960;
    const content = all ? layout.width : LABEL_W + Math.min(3, plan.terms.length) * COL_W;
    const pad = 16;
    const zoom = Math.min(1.1, Math.max(0.3, (width - pad * 2) / content));
    void rf.setViewport({ x: pad, y: pad, zoom }, { duration });
  }, [rf, layout.width, plan.terms.length]);
  // Re-fit when the window toggles or lanes change (row heights move).
  useEffect(() => { fit(full, 0); }, [full, hiddenLanes, fit]);

  const toggleLane = (l: Lane) => setHiddenLanes((s) => { const n = new Set(s); if (n.has(l)) n.delete(l); else n.add(l); return n; });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-muted" id="lane-filter-label">Lanes:</span>
        <div role="group" aria-labelledby="lane-filter-label" className="flex flex-wrap gap-2">
          {presentLanes.map((l) => {
            const on = !hiddenLanes.has(l);
            return (
              <button key={l} type="button" aria-pressed={on} onClick={() => toggleLane(l)}
                className={`rounded-md border px-2.5 py-1 text-sm transition-colors duration-150 ${on ? "border-blue bg-blue-tint text-ink" : "border-border bg-bg text-muted hover:bg-surface"}`}>
                {LANE_LABEL[l]}
              </button>
            );
          })}
        </div>
        <span className="flex-1" />
        <button type="button" aria-pressed={full} onClick={() => setFull((f) => !f)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface">
          <Maximize2 size={14} aria-hidden="true" /> {full ? "Show the next three terms" : "Show full timeline"}
        </button>
      </div>

      <div ref={box} className="relative h-[68vh] min-h-[520px] overflow-hidden rounded-md border border-border bg-surface">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} nodesFocusable={false} edgesFocusable={false}
          minZoom={0.2} maxZoom={1.6} onInit={() => fit(full, 0)} panOnScroll zoomOnScroll={false} zoomOnPinch zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: false }} aria-label="Roadmap chart. Use the list view for a text version."
          onPaneClick={() => setHovered(null)}>
        </ReactFlow>
        <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-md border border-border-strong bg-bg">
          <button type="button" aria-label="Zoom in" onClick={() => void rf.zoomIn({ duration: 150 })} className="p-2 text-ink hover:bg-surface"><Plus size={16} aria-hidden="true" /></button>
          <button type="button" aria-label="Zoom out" onClick={() => void rf.zoomOut({ duration: 150 })} className="border-t border-border p-2 text-ink hover:bg-surface"><Minus size={16} aria-hidden="true" /></button>
          <button type="button" aria-label="Fit to view" onClick={() => fit(full)} className="border-t border-border p-2 text-ink hover:bg-surface"><Scan size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <p className="text-xs text-muted">Drag or scroll to move around; pinch or use the buttons to zoom. Hover or focus a goal to see what it depends on and what it unlocks.</p>
    </div>
  );
}

export default function RoadmapChart(props: RoadmapChartProps) {
  return <ReactFlowProvider><Chart {...props} /></ReactFlowProvider>;
}
