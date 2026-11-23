# Career Pathway Mapper: standing rules for coding sessions

- Spec: `docs/ALGORITHM.md`. Current build task: `docs/BUILD_PROMPT.md`.
- The planning engine (`src/engine/`) is pure and deterministic: no DOM, no fetch, no `Date.now()`. Pass `today` in.
- Don't change engine math or `data/` without a failing test first, an updated ALGORITHM.md, and a bumped `ENGINE_VERSION` or `data/version.json`.
- Never add AI/LLM calls, analytics, trackers, cookies, or third-party scripts. Never ask users for a name or contact info.
- Never invent resources or programs. Everything shown comes from `data/`.
- Before committing: `npm run validate` and `npm test` must pass.
- Design: follow design/DESIGN.md. Four colours (#E0E7DA, #456894, #00A37D, #E6B989) plus ink #1A1F24 for words and navy #2F3F6E for the landing, Barlow Semi Condensed (headings and bold labels only), Quantico and IBM Plex Mono, nothing under 15px, no shadows, gradients, emoji or icons-as-decoration. The landing's painted scene (src/app/landing/scene.ts) is the only animated picture; screens change by fading. Respect prefers-reduced-motion.
