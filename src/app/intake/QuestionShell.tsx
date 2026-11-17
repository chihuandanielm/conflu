import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "../ui/Button.tsx";
import type { StepCopy } from "./copy.ts";

/**
 * The question sheet (design/DESIGN.md §7.2): solid sage with drafting corners, so it covers the river when a long
 * question scrolls over it. The question, help, why we ask, the control, then Back ... Skip and Continue, then the
 * keyboard hint. Continue is never disabled: pressing it with a required answer missing marks that question instead
 * (see `notice`). The progress gauge sits above the sheet, outside it, so it stays still while sheets change.
 */
export function QuestionShell({ copy, headingId, children, onBack, onContinue, continueLabel = "Continue",
  showContinue = true, onSkip, secondary, focusHeading = true, notice, keyHint = true }: {
  copy: StepCopy; headingId: string; children: ReactNode;
  onBack: () => void; onContinue: () => void; continueLabel?: string; showContinue?: boolean;
  onSkip?: () => void; secondary?: ReactNode; focusHeading?: boolean; notice?: ReactNode; keyHint?: boolean;
}) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (focusHeading) h1.current?.focus({ preventScroll: true }); }, [headingId, focusHeading]);
  return (
    <main className="corners w-full bg-sage px-[clamp(16px,4vw,30px)] pt-[26px] pb-[22px]">
      <h1 id={headingId} ref={h1} tabIndex={-1} className="text-h1">{copy.question}</h1>
      {copy.help && <p className="mt-2.5">{copy.help}</p>}
      {copy.why && <p className="mt-2.5 text-small">{copy.why}</p>}
      <div className="mt-5">{children}</div>
      {notice}
      <nav aria-label="Question navigation" className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <span className="flex-1" />
        {secondary}
        {onSkip && <Button variant="text" onClick={onSkip}>Skip</Button>}
        {showContinue && <Button onClick={onContinue}>{continueLabel}</Button>}
      </nav>
      <p className="fact mt-4 hidden min-[600px]:block">
        {keyHint ? "Number keys pick an option, Enter continues, Escape goes back." : "Enter continues, Escape goes back."}
      </p>
    </main>
  );
}
