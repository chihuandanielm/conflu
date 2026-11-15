import { useEffect, useRef } from "react";
import { Clock, Lock, Route } from "lucide-react";
import { Button } from "../ui/Button.tsx";

export function Intro({ onStart, hasProgress, onResume, onStartOver }: {
  onStart: () => void; hasProgress: boolean; onResume: () => void; onStartOver: () => void;
}) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1.current?.focus({ preventScroll: true }); }, []);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col justify-center px-4 py-12 sm:px-6">
      <p className="font-mono text-xs text-muted">Career Pathway Mapper</p>
      <h1 ref={h1} tabIndex={-1} className="mt-3 text-2xl font-semibold outline-none">
        Answer a few questions and get a semester-by-semester career plan, with the programs and resources that fit you.
      </h1>
      <ul className="mt-8 flex flex-col gap-4 text-base">
        <li className="flex gap-3"><Route size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-green" />
          <span>It's a general trajectory, not a blueprint. Use it to decide what to do next, and adjust as you go.</span></li>
        <li className="flex gap-3"><Clock size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-green" />
          <span>Takes about 3 minutes. No account, no name, no email.</span></li>
        <li className="flex gap-3"><Lock size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-green" />
          <span>Nothing is stored outside your browser. Your answers never leave this device.</span></li>
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        {hasProgress ? (
          <>
            <Button onClick={onResume}>Continue where you left off</Button>
            <Button variant="secondary" onClick={onStartOver}>Start over</Button>
          </>
        ) : (
          <Button onClick={onStart}>Start</Button>
        )}
      </div>
    </main>
  );
}
