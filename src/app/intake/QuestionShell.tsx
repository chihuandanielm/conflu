import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "../ui/Button.tsx";
import { ProgressBar } from "../ui/ProgressBar.tsx";
import type { StepCopy } from "./copy.ts";

/** One question owns the screen: progress, question, help, controls, then Back / Skip / Continue. */
export function QuestionShell({ copy, headingId, step, total, children, onBack, onContinue, canContinue, continueLabel = "Continue",
  showContinue = true, onSkip, secondary, focusHeading = true }: {
  copy: StepCopy; headingId: string; step: number; total: number; children: ReactNode;
  onBack: () => void; onContinue: () => void; canContinue: boolean; continueLabel?: string; showContinue?: boolean;
  onSkip?: () => void; secondary?: ReactNode; focusHeading?: boolean;
}) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (focusHeading) h1.current?.focus({ preventScroll: true }); }, [headingId, focusHeading]);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-[640px] px-4 pt-6 sm:px-6">
        <ProgressBar value={step} max={total} label="Intake progress" />
      </header>
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <h1 id={headingId} ref={h1} tabIndex={-1} className="text-2xl font-semibold text-ink outline-none">{copy.question}</h1>
        {copy.help && <p className="mt-2 text-base text-muted">{copy.help}</p>}
        {copy.why && (
          <p className="mt-3 flex items-start gap-2 text-sm text-muted">
            <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-blue" />
            <span>{copy.why}</span>
          </p>
        )}
        <div className="mt-8">{children}</div>
        <nav aria-label="Question navigation" className="mt-10 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" /> Back</Button>
          <span className="flex-1" />
          {secondary}
          {onSkip && <Button variant="ghost" onClick={onSkip}>Skip</Button>}
          {showContinue && <Button onClick={onContinue} disabled={!canContinue}>{continueLabel}</Button>}
        </nav>
        <p className="mt-6 hidden text-xs text-muted sm:block">
          Keyboard: number keys pick an option, Enter continues, Escape goes back.
        </p>
      </main>
    </div>
  );
}
