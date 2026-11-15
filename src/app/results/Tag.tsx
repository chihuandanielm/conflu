import type { ReactNode } from "react";

const tones = {
  gate: "bg-blue-tint text-blue",
  partial: "bg-surface text-muted border border-border",
  done: "bg-green-tint text-green",
  moved: "bg-blue-tint text-blue",
};
export function Tag({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
