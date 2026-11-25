import { useEffect, useRef, useState } from "react";

const FISH = "><>";
const WATER = "~-~~-";
/** Plex Mono advance at the gauge's 15px (0.6 em). It was 13px, which made the line too long and cut the fish off. */
const CHAR = 15 * 0.6;

/**
 * The fish gauge (design/DESIGN.md §7.2): one mono line, water behind the fish, a green fish at the current position,
 * dots ahead. The number of positions follows whatever the step count is; the caption says it in words.
 */
export function ProgressBar({ value, max, label, caption }: { value: number; max: number; label: string; caption?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(60);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setCols(Math.max(12, Math.floor(el.getBoundingClientRect().width / CHAR) || 60));
    measure();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const at = Math.max(FISH.length, Math.round((cols - FISH.length) * (max ? value / max : 0)) + FISH.length);
  let behind = "", ahead = "";
  for (let i = 0; i < at - FISH.length; i++) behind += WATER[i % WATER.length];
  for (let i = at; i < cols; i++) ahead += (i - at) % 2 ? "." : " ";
  return (
    <div ref={box} className="w-full">
      <p role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
        className="m-0 overflow-hidden font-mono text-fact leading-[1.2] whitespace-pre">
        <span aria-hidden="true">{behind}<b aria-hidden="true" className="font-semibold text-green">{FISH}</b>{ahead}</span>
      </p>
      <p className="mt-1 text-small">{caption ?? `Step ${value} of ${max}`}</p>
    </div>
  );
}
