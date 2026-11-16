# Career Pathway Mapper: standing rules for coding sessions

- Spec: `docs/ALGORITHM.md`. Current build task: `docs/BUILD_PROMPT.md`.
- The planning engine (`src/engine/`) is pure and deterministic: no DOM, no fetch, no `Date.now()`. Pass `today` in.
- Don't change engine math or `data/` without a failing test first, an updated ALGORITHM.md, and a bumped `ENGINE_VERSION` or `data/version.json`.
- Never add AI/LLM calls, analytics, trackers, cookies, or third-party scripts. Never ask users for a name or contact info.
- Never invent resources or programs. Everything shown comes from `data/`.
- Before committing: `npm run validate` and `npm test` must pass.
- Design: white background, navy text, calm blue/green accents, IBM Plex Sans, no gradients/emoji/glassmorphism, motion ≤ 250ms, respect prefers-reduced-motion.
