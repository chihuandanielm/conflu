import type { ReactNode } from "react";

/**
 * The head of a major section on the results page (design/DESIGN.md §4): a 3px blue rule across the width, the title in
 * bold Barlow, and a count in mono on the right. It replaces the faint dotted shore between sections.
 */
export function SectionHead({ id, title, count, level = 2 }: { id: string; title: ReactNode; count?: ReactNode; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-[3px] border-blue pt-2.5">
      <H id={id} className="text-h2">{title}</H>
      {count && <span className="fact">{count}</span>}
    </div>
  );
}
