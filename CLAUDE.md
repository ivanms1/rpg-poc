# He is Coming — browser clone

Personal browser remake of the roguelite auto-battler *He is Coming*. Plan and phases: [docs/PLAN.md](docs/PLAN.md).
Rules spec: [docs/research/mechanics.md](docs/research/mechanics.md). Content data: [docs/research/content.md](docs/research/content.md).

## Commands
- `npm run dev` — dev server (`/?arena` = combat debug arena)
- `npm test` / `npm run test:coverage` — Vitest (core coverage threshold 80%)
- `npm run test:e2e` — Playwright (builds + previews on :4173)
- `npm run typecheck` · `npm run lint` (oxlint)

## Layout
- `src/core/` — pure, deterministic game logic. No DOM.
  - `combat/` — `simulateBattle(player, enemy)` → event log with per-event snapshots. `ops.ts` holds the primitives (damage, heal, status…).
  - `effects/dsl.ts` — vocabulary for item/creature effects (`when(fasterThanEnemy, gain('attack', 2))`).
  - `items/` — item/creature types, `buildPlayer(loadout)`, tiers (Golden ×2, Diamond ×4 via `x()` and `{n}` text placeholders).
- `src/data/` — content: weapons, items, enemies (3 levels), bosses. Each effect item has a test in `*.test.ts`.
- `src/render/` — canvas tileset atlas (Bountiful Bits 1-bit sheet, tinted per tile), palette.
- `src/ui/` — React components on a 480×270 art-pixel stage scaled by an integer factor.
  - `combat/` — replays a `BattleResult` event log (`playback.ts` pacing/popups, `usePlayback`, `CombatView`).
  - `demo/` — throwaway walk-and-fight demo (map scatter, starter loadout, reducer) until the real run loop (Phase 3–4).

## Conventions
- Game state is immutable; changes go through reducers. Every random draw takes and returns an `Rng`.
- CSS sizes are art pixels (1px = one pixel of the 480×270 stage).
- Where the research is ambiguous, put the behaviour behind a named flag in `core/rules.ts` (see mechanics.md §9).
