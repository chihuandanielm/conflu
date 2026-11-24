import { useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { intake, uiIntake } from "../data/dataset.ts";
import { load, save } from "../state/storage.ts";
import { todayISO } from "../today.ts";
import { COPY, MISSING, PART_HELP, PART_TITLE, SCREEN_COPY, type StepCopy } from "./copy.ts";
import { Landing } from "../landing/Landing.tsx";
import { toTop } from "../ui/scroll.ts";
import { QuestionShell } from "./QuestionShell.tsx";
import { ProgressBar } from "../ui/ProgressBar.tsx";
import { Review } from "./Review.tsx";
import { ChipList } from "./controls/ChipChecklist.tsx";
import { MajorPicker } from "./controls/MajorPicker.tsx";
import { ExperiencePicker } from "./controls/ExperiencePicker.tsx";
import { RankedChips } from "./controls/RankedChips.tsx";
import { SingleChoice, type Choice } from "./controls/SingleChoice.tsx";
import { TrackPicker } from "./controls/TrackPicker.tsx";
import { YearTermPicker } from "./controls/YearTermPicker.tsx";
import {
  emptyAnswers, firstIncomplete, identityLabel, isAnswered, isMulti, isSummerBreak, majorOfferedAt, OPTIONAL, screenOf, screensFor, stepsFor,
  type Answers, type Enrollment, type GradApps, type School, type ScreenId, type StepId,
} from "./model.ts";

export const INTAKE_KEY = "cpm.intake.v1";
const ADVANCE_MS = 250;

/** `showMissing`: mark this screen's missing required answers (after a Continue press, or when opened from the review). */
export interface IntakeState { answers: Answers; step: ScreenId; returnToReview: boolean; showMissing?: boolean }

type Action =
  | { type: "set"; patch: Partial<Answers> }
  | { type: "toggle"; field: "experience" | "skills" | "credentials" | "identity"; id: string }
  | { type: "start" } | { type: "next" } | { type: "back" } | { type: "go"; step: StepId | ScreenId; returnToReview?: boolean } | { type: "reset" };

const required = (s: StepId) => !OPTIONAL.has(s) && !isMulti(s);
const partsOf = (step: ScreenId, a: Answers): StepId[] => screensFor(a).find((s) => s.id === step)?.parts ?? [];
/** Required answers still missing on a screen. */
export const missingOn = (step: ScreenId, a: Answers) => partsOf(step, a).filter((p) => required(p) && !isAnswered(p, a));

export function reducer(state: IntakeState, action: Action): IntakeState {
  const { answers, step } = state;
  switch (action.type) {
    case "set": return { ...state, answers: { ...answers, ...action.patch } };
    case "toggle": {
      const list = answers[action.field];
      return { ...state, answers: { ...answers, [action.field]: list.includes(action.id) ? list.filter((x) => x !== action.id) : [...list, action.id] } };
    }
    case "start": return { answers: { ...answers, status: "college-student" }, step: "study", returnToReview: false };
    case "next": {
      // A required answer is missing: stay, and mark it.
      if (missingOn(step, answers).length) return { ...state, showMissing: true };
      const seen = [...new Set([...answers.seen, ...partsOf(step, answers)])];
      const a = { ...answers, seen };
      if (state.returnToReview) return { answers: a, step: "review", returnToReview: false };
      const steps = stepsFor(a);
      return { answers: a, step: steps[Math.min(steps.indexOf(step) + 1, steps.length - 1)], returnToReview: false };
    }
    case "back": {
      if (state.returnToReview) return { answers, step: "review", returnToReview: false };
      const steps = stepsFor(answers);
      return { answers, step: steps[Math.max(steps.indexOf(step) - 1, 0)], returnToReview: false };
    }
    case "go": {
      const to = screenOf(action.step, answers);
      return { answers, step: to, returnToReview: !!action.returnToReview, showMissing: !!action.returnToReview };
    }
    case "reset": return { answers: emptyAnswers(), step: "study", returnToReview: false };
  }
}

export function initialIntake(): IntakeState {
  const saved = load<IntakeState>(INTAKE_KEY);
  if (saved?.answers && saved.step) return { ...saved, answers: { ...emptyAnswers(), ...saved.answers }, step: "intro", showMissing: false };
  return { answers: emptyAnswers(), step: "intro", returnToReview: false };
}

/**
 * Where a returning student picks up: the screen they were on (steps saved by older versions map to the screen that
 * now asks them), unless they'd saved the review with a required answer missing.
 */
function resumeStep(): ScreenId {
  const saved = load<IntakeState>(INTAKE_KEY);
  if (!saved?.answers) return "study";
  const a = { ...emptyAnswers(), ...saved.answers };
  const missing = firstIncomplete(a);
  if (saved.step === "intro") return "study";
  return screenOf(missing && saved.step === "review" ? missing : saved.step, a);
}

export function IntakeFlow({ onBuild, startAt, onContinuePlan, onStartOver, initialAnswers }: {
  onBuild: (a: Answers) => void; startAt?: StepId | ScreenId; onContinuePlan?: () => void; onStartOver?: () => void; initialAnswers?: Answers;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, (): IntakeState => {
    const s = initialIntake();
    if (initialAnswers) return { answers: initialAnswers, step: screenOf(startAt ?? "review", initialAnswers), returnToReview: false };
    return startAt ? { ...s, step: screenOf(startAt, s.answers) } : s;
  });
  const { answers, step } = state;
  const latest = useRef(answers);
  latest.current = answers;
  const hasProgress = useRef(!!load<IntakeState>(INTAKE_KEY)?.answers?.seen?.length).current;
  const timer = useRef<number | undefined>(undefined);
  const reduce = useReducedMotion();
  // The landing is its own screen ("intro"); the questions and the review are "ask". The landing runs its own exit
  // (its words fade, then its navy fades to sage), so the questions only fade in once it has gone.
  const group = step === "intro" ? "intro" : "ask";
  // Arriving at the questions or the review from another screen: start at the top (nothing shows yet).
  useEffect(() => { if (group === "ask") toTop(); }, [group]);

  // Save on every change (except the intro screen, so "Continue where you left off" keeps the real step).
  useEffect(() => { if (step !== "intro") save(INTAKE_KEY, state); }, [state, step]);

  const cancelAdvance = () => { window.clearTimeout(timer.current); timer.current = undefined; };
  useEffect(() => cancelAdvance, []);
  /** Continue: moves on, or (with something missing) marks it and puts focus on the first missing question. */
  const next = useCallback(() => {
    cancelAdvance();
    const missing = missingOn(step, latest.current);
    dispatch({ type: "next" });
    if (missing.length) requestAnimationFrame(() => document.getElementById(partHeadingId(missing[0]))?.focus());
  }, [step]);
  const back = useCallback(() => { cancelAdvance(); dispatch({ type: "back" }); }, []);
  /**
   * Single-choice answers: show the selection, then move on after a short beat, but only when this was the screen's
   * last required question and nothing required is missing. Optional screens never move on by themselves.
   */
  const choose = useCallback((patch: Partial<Answers>, part: StepId) => {
    cancelAdvance();
    dispatch({ type: "set", patch });
    const a = { ...latest.current, ...patch };
    const last = partsOf(step, a).filter(required).at(-1);
    if (part === last && !missingOn(step, a).length) timer.current = window.setTimeout(() => dispatch({ type: "next" }), ADVANCE_MS);
  }, [step]);
  const toggle = useCallback((field: "experience" | "skills" | "credentials" | "identity", id: string) => dispatch({ type: "toggle", field, id }), []);

  const screens = screensFor(answers);
  const qIndex = screens.findIndex((s) => s.id === step);
  const parts = partsOf(step, answers);
  const missing = state.showMissing ? missingOn(step, answers) : [];

  // Keyboard: Enter continues, Escape goes back. Buttons and text fields handle their own Enter.
  useEffect(() => {
    if (step === "intro") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "Escape") { e.preventDefault(); back(); }
      else if (e.key === "Enter" && tag !== "BUTTON" && tag !== "INPUT" && tag !== "A" && step !== "review") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, back, next]);

  const headingId = `q-${step}`;
  let screen: ReactNode;
  if (step === "intro") {
    screen = <Landing hasProgress={hasProgress} onStart={() => dispatch({ type: "start" })}
      onResume={() => dispatch({ type: "go", step: resumeStep() })} onContinuePlan={onContinuePlan}
      onStartOver={() => { onStartOver?.(); dispatch({ type: "reset" }); dispatch({ type: "start" }); }} />;
  } else if (step === "review") {
    screen = <Review answers={answers} onBack={back}
      onStartOver={onContinuePlan ? () => { onStartOver?.(); dispatch({ type: "reset" }); dispatch({ type: "start" }); } : undefined}
      onEdit={(s) => dispatch({ type: "go", step: s, returnToReview: true })} onBuild={() => onBuild(answers)} />;
  } else {
    const single = parts.length === 1;
    const copy: StepCopy = single ? COPY[parts[0] as keyof typeof COPY] : SCREEN_COPY[step]!;
    // Number keys only where one list of options owns the screen (with two lists, "2" would be ambiguous).
    const numbered = parts.filter((p) => !isMulti(p) && p !== "major").length === 1;
    const anyAbout = !!(answers.location || answers.citizenship || answers.gender || answers.identity.length);
    screen = (
      <QuestionShell focusHeading copy={copy} headingId={headingId}
        onBack={back} onContinue={next} keyHint={numbered}
        continueLabel={state.returnToReview ? "Back to review"
          : step === "experience" && !answers.experience.length ? "None yet, continue"
          : step === "about" && !anyAbout ? "Skip these" : "Continue"}
        notice={missing.length > 0 && (
          <p role="alert" className="notice mt-6">
            {missing.length === 1 ? "1 question on this page still needs an answer." : `${missing.length} questions on this page still need an answer.`}
          </p>
        )}>
        <div className="flex flex-col gap-6">
          {parts.map((p, i) => (
            <Part key={p} first={i === 0} part={p} single={single} message={p === "year" && answers.year && !answers.semester ? "Pick fall or spring to continue." : MISSING[p]} headingId={single ? headingId : partHeadingId(p)} missing={missing.includes(p)}>
              {renderPart(p, answers, single ? headingId : partHeadingId(p), missing.includes(p), numbered, choose, toggle)}
            </Part>
          ))}
        </div>
      </QuestionShell>
    );
  }

  const announce = qIndex >= 0 ? `Step ${qIndex + 1} of ${screens.length}. ${(parts.length === 1 ? COPY[parts[0] as keyof typeof COPY] : SCREEN_COPY[step]!).question}`
    : step === "review" ? "Check your answers." : "";

  // The landing manages its own fade; the questions fade in over 350ms on the sage it leaves behind. Going back to the
  // landing, its navy fades in under it (Landing.tsx). Between questions only the sheet moves: 18px left and out, the next in from 18px
  // right (260ms). With reduced motion nothing moves.
  const ease = [0.22, 0.61, 0.36, 1] as const;
  return (
    <>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announce}</p>
      {group === "intro" ? (
        // The landing fades itself out before handing over, so nothing here waits on an exit animation.
        screen
      ) : (
        <AnimatePresence>
          <motion.div key="ask" className="mx-auto flex min-h-dvh w-full max-w-[672px] flex-col items-center px-4 pt-[18px] pb-12"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, ease }}>
            <header className="w-full max-w-[640px]">
              <ProgressBar label="Intake progress" max={screens.length}
                value={step === "review" ? screens.length : qIndex + 1} caption={step === "review" ? "Review" : undefined} />
            </header>
            <div className="mt-[clamp(16px,5vh,56px)] w-full max-w-[640px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} initial={{ opacity: 0, x: reduce ? 0 : 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduce ? 0 : -18 }}
                  transition={{ duration: reduce ? 0 : 0.26, ease }}>
                  {screen}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}

const partHeadingId = (p: StepId) => `part-${p}`;
const missingId = (p: StepId) => `missing-${p}`;

/**
 * One question on a screen. On a shared screen it has its own heading, help, and "why". A missing required answer is
 * tinted amber with a colored line saying what to pick.
 */
function Part({ part, single, first, headingId, missing, message, children }: {
  part: StepId; single: boolean; first: boolean; headingId: string; missing: boolean; message?: string; children: ReactNode;
}) {
  const c = COPY[part as keyof typeof COPY];
  const help = PART_HELP[part] ?? c.help;
  return (
    <>
      {/* Questions that share a sheet are parted by a shore. */}
      {!single && !first && <hr className="shore" />}
      {/* A missing required answer: the sand bar beside the question, and a line saying what to pick. */}
      <section aria-labelledby={single ? undefined : headingId}
        className={`border-l-[3px] ${missing ? "border-sand pl-4" : "border-transparent"} ${single ? "" : "-ml-[3px]"}`}>
        {!single && (
          <div className="mb-4">
            <h2 id={headingId} tabIndex={-1} className="text-lead">
              {PART_TITLE[part] ?? c.question}
              {part === "credentials" && <span className="fact ml-3 align-middle">optional</span>}
            </h2>
            {help && <p className="mt-1 text-small">{help}</p>}
            {c.why && <p className="mt-2 text-small">{c.why}</p>}
          </div>
        )}
        {missing && <p id={missingId(part)} className="mb-3">{message}</p>}
        {children}
      </section>
    </>
  );
}

function renderPart(part: StepId, a: Answers, labelledBy: string, missing: boolean, numbered: boolean,
  choose: (p: Partial<Answers>, part: StepId) => void,
  toggle: (field: "experience" | "skills" | "credentials" | "identity", id: string) => void): ReactNode {
  const invalid = { invalid: missing, describedBy: missing ? missingId(part) : undefined };
  const single = <V extends string | number>(choices: Choice<V>[], value: V | undefined, patch: (v: V) => Partial<Answers>) =>
    <SingleChoice labelledBy={labelledBy} numberKeys={numbered} choices={choices} value={value} onSelect={(v) => choose(patch(v), part)} {...invalid} />;
  /** Optional questions: tapping the picked answer again clears it. */
  const optional = <V extends string>(choices: Choice<V>[], value: V | undefined, key: "location" | "citizenship" | "gender") =>
    single(choices, value, (v) => ({ [key]: v === value ? undefined : v }));
  const noSkip = <T extends { id: string }>(xs: T[]) => xs.filter((x) => x.id !== "skip");

  switch (part) {
    case "school":
      // A campus that doesn't offer the chosen major clears it (and the co-op answer that depended on it).
      return single(uiIntake.school.options.map((o) => ({ value: o.id as School, label: o.label })), a.school,
        (v) => (majorOfferedAt(a.majorId, v) || !a.majorId ? { school: v } : { school: v, majorId: undefined, openToCoop: undefined }));
    case "major":
      return a.school
        ? <MajorPicker labelledBy={labelledBy} school={a.school} value={a.majorId} onSelect={(id) => choose({ majorId: id }, "major")} {...invalid} />
        : <p className="text-small text-blue">Pick your campus first.</p>;
    case "year":
      return (
        <>
          {isSummerBreak(todayISO()) && <p className="mb-4 bg-sage px-4 py-3 text-small text-blue">{uiIntake.year.summerHint}</p>}
          <YearTermPicker a={a} onPick={(p) => choose(p, "year")} {...invalid} />
        </>
      );
    case "enrollment":
      return single(intake.enrollment.map((o) => ({ value: o.id as Enrollment, label: o.label, note: o.note })), a.enrollment, (v) => ({ enrollment: v }));
    case "track":
      return <TrackPicker labelledBy={labelledBy} majorId={a.majorId} value={a.trackId} onSelect={(id) => choose({ trackId: id }, "track")} {...invalid} />;
    case "horizon":
      return single(intake.horizons.map((h) => ({ value: h.id as Answers["horizon"] & string, label: h.label })), a.horizon, (v) => ({ horizon: v }));
    case "gradApps":
      return single(intake.gradApps.map((o) => ({ value: o.id as GradApps, label: o.label, note: "note" in o ? o.note : undefined })), a.gradApps, (v) => ({ gradApps: v }));
    case "experience":
      return <ExperiencePicker majorId={a.majorId} selected={a.experience} onToggle={(id) => toggle("experience", id)} />;
    case "skills":
      return <RankedChips label="Skills" options={intake.skills} majorId={a.majorId} trackId={a.trackId} selected={a.skills} onToggle={(id) => toggle("skills", id)} />;
    case "credentials":
      return <RankedChips label="Certifications" options={intake.credentials} majorId={a.majorId} trackId={a.trackId} selected={a.credentials} onToggle={(id) => toggle("credentials", id)} />;
    case "hours":
      return single(intake.weeklyHours.map((h) => ({ value: h, label: `${h} hours a week outside class` })), a.weeklyHours, (v) => ({ weeklyHours: v }));
    case "summer":
      return single(intake.summerAvailability.map((s) => ({ value: s.id as NonNullable<Answers["summer"]>, label: s.label })), a.summer, (v) => ({ summer: v }));
    case "coop":
      return single(uiIntake.coop.options.map((o) => ({ value: o.id, label: o.label })),
        a.openToCoop === undefined ? undefined : a.openToCoop ? "yes" : "no", (v) => ({ openToCoop: v === "yes" }));
    case "location":
      return optional(noSkip(intake.location).map((o) => ({ value: o.id as NonNullable<Answers["location"]>, label: o.label })), a.location, "location");
    case "citizenship":
      return optional(noSkip(intake.citizenship).map((o) => ({ value: o.id as NonNullable<Answers["citizenship"]>, label: o.label })), a.citizenship, "citizenship");
    case "gender":
      return optional(intake.gender.options.map((o) => ({ value: o.id, label: o.label })), a.gender, "gender");
    case "identity":
      return <ChipList label="About you" chips={intake.optionalIdentity.tags.map((t) => ({ id: t, label: identityLabel(t) }))}
        selected={a.identity} onToggle={(id) => toggle("identity", id)} />;
    default:
      return null;
  }
}
