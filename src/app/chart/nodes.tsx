import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, useReducedMotion } from "motion/react";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import { LANE_LABEL, laneTint, type Lane } from "../results/lanes.ts";

export interface ItemData { item: PlanItem; term: PlanTerm; col: number; dim: boolean; changed: boolean;
  onOpen: (it: PlanItem, t: PlanTerm) => void; onHover: (goalId: string | null) => void; onFocusCard: (nodeId: string) => void; [k: string]: unknown }

const hidden = { opacity: 0, width: 1, height: 1, border: 0, minWidth: 0, minHeight: 0, background: "transparent" };

function ItemCard({ id, data, block }: { id: string; data: ItemData; block?: boolean }) {
  const { item, term, col, dim, changed, onOpen, onHover, onFocusCard } = data;
  const reduce = useReducedMotion();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: dim ? 0.22 : 1 }}
      transition={{ duration: reduce ? 0.01 : 0.2, ease: "easeOut", delay: reduce ? 0 : col * 0.06 }}
      style={{ width: "100%", height: "100%" }}>
      <Handle type="target" position={Position.Left} isConnectable={false} style={hidden} />
      <button type="button"
        onClick={() => onOpen(item, term)} onMouseEnter={() => onHover(item.goalId)} onMouseLeave={() => onHover(null)}
        onFocus={() => { onHover(item.goalId); onFocusCard(id); }} onBlur={() => onHover(null)}
        aria-label={`${item.title}, ${item.hours} hours, ${term.label}${item.gate ? ", must-do" : ""}${item.partial ? ", continues next term" : ""}`}
        className={`nodrag nopan flex h-full w-full flex-col justify-between rounded-md border px-3 py-2 text-left transition-colors duration-150
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue
          ${block ? "border-green bg-green-tint" : "border-border-strong bg-bg hover:border-blue"} ${changed ? "ring-2 ring-blue" : ""}`}>
        <span className="line-clamp-2 text-[13px] leading-[1.3] font-semibold text-ink">{item.title}</span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-muted">{item.hours} h</span>
          {block && <span className="rounded-sm bg-bg px-1 text-[11px] font-semibold text-green">Full-time</span>}
          {item.gate && <span className="rounded-sm bg-blue-tint px-1 text-[11px] font-semibold text-blue">Must-do</span>}
          {item.partial && <span className="text-[11px] text-muted">continues →</span>}
        </span>
      </button>
      <Handle type="source" position={Position.Right} isConnectable={false} style={hidden} />
    </motion.div>
  );
}

export const ItemNode = memo(({ id, data }: NodeProps) => <ItemCard id={id} data={data as ItemData} />);
export const BlockNode = memo(({ id, data }: NodeProps) => <ItemCard id={id} data={data as ItemData} block />);

export const LaneNode = memo(({ data }: NodeProps) => {
  const lane = (data as { lane: Lane | "full-time" }).lane;
  return (
    <div className="flex h-full w-full border-b border-border" style={{ background: lane === "full-time" ? "var(--green-tint)" : laneTint(lane) }}>
      <span className="w-[140px] px-3 pt-3 text-xs font-semibold text-ink">{lane === "full-time" ? "Full-time" : LANE_LABEL[lane]}</span>
    </div>
  );
});

export const ColumnNode = memo(({ data }: NodeProps) => {
  const { term, current } = data as { term: PlanTerm; current: boolean };
  return (
    <div className="h-full w-full border-l border-border">
      <div className={`flex h-16 flex-col justify-center border-b border-border px-3 ${current ? "bg-blue-tint" : "bg-bg"}`}>
        <span className="text-[13px] font-semibold text-ink">{term.label}{current && <span className="ml-1 font-normal text-muted">(now)</span>}</span>
        <span className="font-mono text-[11px] text-muted">{term.code} · {term.usedHours} of {term.capacityHours} h</span>
      </div>
    </div>
  );
});

export const nodeTypes = { item: ItemNode, block: BlockNode, lane: LaneNode, column: ColumnNode };
