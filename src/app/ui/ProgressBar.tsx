import { motion, useReducedMotion } from "motion/react";

/** Thin progress bar that fills smoothly. The visible count sits next to it. */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const reduce = useReducedMotion();
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
        className="h-1 flex-1 overflow-hidden rounded-full bg-sage">
        <motion.div className="h-full rounded-full bg-green" initial={false}
          animate={{ width: `${pct}%` }} transition={{ duration: reduce ? 0 : 0.25, ease: "easeOut" }} />
      </div>
      <span className="font-mono text-fact text-blue tabular-nums">{value} of {max}</span>
    </div>
  );
}
