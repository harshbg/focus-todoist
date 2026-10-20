# Focus for Todoist — agent guide

A fork of [Enhanced for Todoist](https://github.com/julesvbertolino/todoist-enhanced)
(MIT) that adds a gamified deep-work timer. The feature is specified in
[`docs/focus/SPEC.md`](docs/focus/SPEC.md); read it before writing code.

## Roles

- **Claude** designs, writes the work packages, reviews every change and fixes
  what does not pass.
- **Gemini and Codex** implement one work package at a time (SPEC §9). Do only
  the package you were given; if the spec is unclear, stop and say so instead
  of guessing.

## The codebase

- React 18, TypeScript, Vite. Zustand for state, `idb` for IndexedDB,
  `date-fns` for dates. No UI or CSS framework — plain CSS with the tokens in
  `src/styles/app.css`.
- No server. The browser talks to the Todoist API directly. Everything durable
  is stored in Todoist (see SPEC §2).
- Rules live in `src/domain` as pure functions with Vitest tests next to them
  (`foo.ts` + `foo.test.ts`). Follow the same pattern.
- Every user-facing string goes through i18n (`src/i18n/en.ts` and `fr.ts`).
- Imports use the `@/` alias for `src/`.

## Rules for this fork

1. New code goes under `src/focus/`. Touch upstream files only to wire things
   in (route, sidebar, preferences, i18n, demo data), and keep those edits
   small so upstream releases still merge.
2. Match the surrounding code: its naming, comment style (a short comment that
   says *why*), and idiom. No new dependencies without saying why.
3. Before you finish, all of these must pass:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
4. Never commit screenshots of the prototype, API keys, tokens, or anything
   from the user's employer.
5. Don't invent Todoist API fields. If you need one, check
   `src/domain/types.ts` and `src/api/` for how the app already uses it.
