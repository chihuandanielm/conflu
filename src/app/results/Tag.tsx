import type { ReactNode } from "react";

const tones = {
  gate: "bg-sage text-blue",
  partial: "bg-sage text-blue border border-blue",
  done: "bg-sage text-blue",
  moved: "bg-sage text-blue",
};
export function Tag({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 text-small ${tones[tone]}`}>{children}</span>;
}
