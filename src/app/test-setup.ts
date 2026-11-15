import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion";
import { afterEach } from "vitest";

// Animations can't complete under fake timers in jsdom; tests check behavior, not motion.
MotionGlobalConfig.skipAnimations = true;
afterEach(() => cleanup());
