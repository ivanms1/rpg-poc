# He is Coming — Browser Clone: Plan

Status: Phase 6 in progress (map clarity, game feel, difficulty done) · 2026-09-23

Reference docs: [research/mechanics.md](research/mechanics.md) (rules spec) ·
[research/content.md](research/content.md) (items/enemies/bosses/sets data) ·
[research/screenshots/](research/screenshots/) (Steam screenshots — ss1 map, ss2/ss6 combat, ss3 weapon pile + tooltip,
ss7 chest, ss8 event cards, ss9 game over).

---

## 1. What we're building

A single-player browser version of *He is Coming*: a 5–10 minute pixel-art roguelite. You walk a fog-of-war
tile map for 3 days + 3 nights per week, collect gear, and every week an auto-battle boss arrives. Three weeks,
final boss, done. All depth is in **item synergies and trigger ordering**; the combat itself is automatic.

**MVP scope:** Woodland area only, one difficulty, no PvP. Fully reproducing Woodland is realistic — it's
~40 weapons, ~100 items, 6 enemy types, 12 bosses + Leshen, ~20 map location types.

**Out of scope (later / maybe never):** Swampland (islands + Hydra), Kingmaker async PvP (needs a backend),
Friend Battle, Gauntlet, challenges/meta unlocks, the Demon King (not in the real game yet — we'd design our own).

## 2. How the game looks (from screenshots)

Fixed 16:9 layout, **480×270 virtual resolution** scaled by an integer factor (4× at 1080p). Dark maroon
background `#201018`, cream frame lines `#e0d8c8` with rivets, gothic pixel font, optional CRT scanlines.

```
+-----------------+----------------------------------------------+
| HP 16/16  G 16  | [Shf][map]  day-night-day-night-...-SKULL    |
| ATK 3           |                              [boss]  [TAB]   |
| ARM 7           +----------------------------------------------+
| SPD 4           |                                              |
+-----------------+      top-down tile map, fog of war,          |
|    [weapon]     |      ~28x16 tiles visible, 1 glyph per tile, |
+-----------------+      coloured frames = enemies/shops/shrines |
|   [1]   [2]     |                                              |
|   [3]   [4]     |                                              |
|   [5]   [6]     |                                              |
|   [7]   [8]     |                                              |
+-----------------+----------------------------------------------+
```
- **Combat screen** replaces the map area: hero left, enemy right, 4 stats under each, status counters,
  floating ±numbers, enemy name + ability text, speed buttons (pause / ▶ / ▶▶ / ▶▶▶, Ctrl = skip).
- **Modals** over the map for chests/shops/piles: pick 1 of 3, hover tooltips with stats + effect + set info.
- The **Bountiful Bits 10×10** tileset (CC0, in `assets/bountiful-bits/`) is a near-perfect style match for the
  map layer; the real game uses ~9–10px single-colour glyphs too.

## 3. Tech stack — decision

| Layer | Choice | Why |
|---|---|---|
| Language / build | **TypeScript + Vite** | Fast dev loop, static output deploys anywhere (Vercel, itch.io). |
| Game logic | **Pure TS modules, no rendering deps** | Deterministic, seeded, unit-testable. This is 70% of the work. |
| UI (panels, inventory, tooltips, modals, timeline) | **React** DOM, CSS scaled by `--px` | The game is ~80% UI. DOM gives text wrap, hover, drag-and-drop, layout for free. |
| Map + combat sprites | **Canvas 2D** (single `<canvas>`, `imageSmoothingEnabled=false`) | ~450 tinted tiles per frame is trivial; no engine needed. |
| Tests | **Vitest** (core, ≥80% coverage) + **Playwright** (critical flows) | Combat engine is ideal for TDD against the rules spec. |

**Considered and rejected:**
- **Three.js** — a 3D library; a 2D grid game would fight the orthographic camera and gain nothing.
- **Impact.js** — dormant since 2024 (author moved to the C `high_impact`), no TypeScript, no npm package.
- **Phaser 4** (4.2.1, very active) — the best *engine* option, but every tooltip, inventory slot and text box
  would be hand-built on canvas. Keep as fallback if we find we want everything in one canvas.
- **PixiJS v8** — only if we later want GPU shaders (CRT effect, flashes). Can be dropped into the map layer
  without touching core or UI. CSS overlay covers scanlines for now.

## 4. Architecture

```
src/
  core/                      ← pure, deterministic, no DOM
    rng.ts                   seeded PRNG (mulberry32); every random call takes rng explicitly
    types.ts                 Stats, Fighter, Item, Status, GameState, Action
    rules.ts                 rule flags for the open questions (freeze rounding, every-other-turn parity…)
    combat/
      simulate.ts            simulateBattle(player, enemy, rng) → { events: BattleEvent[], outcome }
      triggers.ts            trigger dispatch in the spec order (trait → weapon → edge → slots → sets)
      statuses.ts            poison/acid/regen/riptide/freeze/stun/thorns/purity ticks
      damage.ts              dealDamage / loseHealth / loseArmor + event emission
    effects/
      registry.ts            itemId → hooks
      dsl.ts                 declarative effects for the ~70% simple items
    world/
      mapgen.ts              biome regions, paths, POI placement
      clock.ts               steps → day/night/week, sight radius
      movement.ts            player step, night chase AI, encounter detection
    run/
      reducer.ts             (GameState, Action) → GameState — the only way state changes
      inventory.ts           equip/swap/reorder/discard, sets, golden/diamond
      locations.ts           chest, merchant, forge, campfire… as action handlers
  data/                      typed content tables generated from research/content.md
    weapons.ts items.ts enemies.ts bosses.ts sets.ts edges.ts
  render/
    atlas.ts                 tileset slicing + per-colour tinting (cached offscreen canvases)
    mapRenderer.ts           draws visible tiles + fog + POI frames
    combatPlayer.ts          replays BattleEvent[] with 1×/2×/3×/skip speeds
  ui/                        React components
    App.tsx StatPanel.tsx Inventory.tsx Timeline.tsx Tooltip.tsx
    CombatView.tsx modals/{Chest,Merchant,Forge,WeaponPile}.tsx
```

**Key design choices**
1. **Simulate, then replay.** Combat is computed instantly into an event log (`strike`, `damage`, `armorLost`,
   `statusApplied`, `trigger`, `heal`…). The UI just animates the log. That gives skip/fast-forward for free,
   makes battles testable as `expect(events).toEqual(...)`, and keeps rendering out of rules.
2. **Immutable state + reducer.** `GameState` is never mutated; every input (`Move`, `PickItem`, `Reorder`,
   `Buy`, `Sleep`…) goes through `reducer`. That gives save/load (JSON to localStorage), replays, and undo for debugging.
3. **Hybrid effect system.** Most items fit `{ trigger, condition?, action }`, for example
   `{ trigger: 'battleStart', action: { gain: { thorns: 3 } } }`. The weird ones (Bearclaw Blade "attack = missing
   health", Mountain Troll "strikes every other turn") get a small hand-written hook. Each item has one test
   asserting its wiki text.
4. **Seeded runs.** One seed → same map, same chest rolls. That makes bugs reproducible and shareable
   ("seed of the day" is nearly free later).
5. **Rule flags.** The research left open questions (see mechanics.md §9). Each is a named flag in `rules.ts`
   with our default, so switching a behaviour is a one-line change.

## 5. Phases

Each phase ends with something playable or testable.

### Phase 0 — Scaffold (½ day) ✅
- Vite + React + TS, Vitest, Playwright, oxlint, git init.
- 480×270 integer-scaled stage, pixel font, frame/border styles, CRT overlay toggle.
- Tileset atlas: slice Bountiful Bits into named tiles (`tree`, `rock`, `path_*`, `water_*`, `tent`…), tint on load.
- **Done when:** a static mock of the layout above renders crisply at every window size.

### Phase 1 — Combat engine (TDD) (2–3 days) ✅
- Stats, battle loop, damage/armor, all triggers, all statuses except Powder, fatigue.
- Content: Wooden Stick, 6 Woodland enemies × 3 levels, ~20 items covering every trigger type, 3 bosses.
- Debug page: pick a loadout and an enemy, run the fight, show the event log.
- **Done when:** ≥80% coverage on `core/combat`, and hand-checked fights match expected outcomes
  (e.g. Hedgehog thorns, Bear vs armor, Spider speed check).

### Phase 2 — Combat view (1–2 days) ✅
- CombatView replays events: sprites, stat bars, floating numbers, status counters, speed controls, skip.
- **Done when:** a fight watched at 1× reads clearly and matches the log.

### Phase 3 — Overworld (3–4 days) ✅
- Map generation: ~64×48 Woodland with 4 biome regions (Starting Area, Flower Glade, Rocky Plains, Forest),
  connected dirt paths, rivers + bridges, POIs placed by biome rules. Home next to spawn.
- Movement (WASD/arrows; click-to-move as an optional extra), camera follow, fog of war (sight 5 day / 3 night,
  revealed tiles persist), day/night clock + timeline bar, night chase AI, touch → battle.
- Locations: Treasure Chest, Campfire, Home, Weapon Pile.
- **Done when:** you can walk a full week, fight enemies, pick up items, and sleep.

### Phase 4 — Full run loop (2–3 days) ✅
_Already done in Phase 3: weekly boss (random pool, Tab preview, fight early), +2 slots per boss, week progression
with enemy levels, game over / victory screens, double-click discard, `?seed=` runs._
- Inventory UI: 1 weapon + 4/6/8 slots, drag to reorder, double-click to discard, tooltips with set info.
- Boss at end of each week (random from week pool), Tab preview, +2 slots on win, Leshen → Abomination finale.
- Gold, Traveling Merchant (reroll), Blade Oil, Forge (edges), Hero's Grave (opens at night), Jewelry Box.
- Title screen, game over / victory summary, save/resume in localStorage.
- **Done when:** a full 3-week run is playable start to finish. **← This is the MVP.**

### Phase 5 — Content completion (ongoing, parallelisable) ✅
_Not yet: Hidden Dagger, Grindstone Club, Gemstone Scepter, Explosive Sword, Kindling Bomb, Powder Keg, Bomb Bag,
Twinfuse Knot, Vampire's Tooth, Cleansing Edge, Fairy Queen, Large Golem, Wishing Well boons._
- All Woodland weapons, items, jewelry, food, sets, edges, oils; Golden/Diamond + Golem; Cauldron recipes;
  weapon modifications; remaining locations (Crystal Ball, Lookout Tower, Waypoint, Fairy, Wishing Well,
  Bargaining Tent, Woodcutter).
- Written as data plus one test per item, so it can be split across parallel agents.

### Phase 6 — Polish
- ✅ Map clarity: faded remains of used locations and defeated enemies, hold Shift (or pin with Shf) to zoom
  out to everything explored, click a revealed tile to walk there (routes go around enemies and unused
  locations, over seen tiles only).
- ✅ Game feel: synthesized SFX (Web Audio, no files; cues in `src/audio/cues.ts`) with a remembered mute
  (button or M), arena shake on heavy hits and deaths, and the land withering (a darkening red tint) as the
  run nears the final boss.
- ✅ Difficulty modes (Normal / Hard / Very Hard, after the real game's Patch #08; `src/core/run/difficulty.ts`),
  picked on the title screen and remembered, or `?difficulty=` for a `?seed=` run.
- Creature sprites, mobile/touch layout, deploy (static → Vercel or itch.io).

### Later (optional)
Swampland (island maps, ferryman, 8 new statuses in play, Hydra), challenges + unlocks, an original Demon King
boss, daily seed.

**Rough total to MVP (Phases 0–4): ~2 weeks of focused work.**

## 6. Assets

| Need | Source | Status |
|---|---|---|
| Map terrain, buildings, trees, water, paths, UI frames | Bountiful Bits 10×10 (CC0) | ✅ have |
| Hero, enemies, bosses | *Missing* — tileset has no creatures | ❓ decide |
| ~150 item/weapon icons | *Missing* | ❓ decide |
| Pixel font (gothic/blackletter) | Free pixel fonts, e.g. from Google Fonts or itch.io | ❓ pick in Phase 0 |
| SFX | jsfxr-generated or a CC0 pack | Phase 6 |

**Options for the missing sprites:**
- (a) Another CC0 1-bit pack with creatures and items. Kenney's *1-Bit Pack* is 16×16 and *Micro Roguelike*
  is 8×8; both would need checking and would sit at a different scale.
- (b) Hand-draw 10×10 glyphs. The style is tiny and one colour, so this is very feasible, and an item icon is
  ~10 minutes of work.
- (c) Placeholders now (a coloured letter or symbol in a frame), real art later.

Recommendation: **(c) for Phases 0–4, then (a) or (b).** The architecture doesn't care.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Rules ambiguity (8 open questions) | Rule flags plus a debug arena to compare against gameplay footage. |
| Item-effect long tail (weird one-offs) | Hybrid DSL + hooks, one test per item, add in Phase 5. |
| Data drift (wiki numbers are Jul–Sep 2025; game patched since) | Treat as a baseline and tune for fun, not parity. |
| Map generation feeling flat | Start with biome templates + random POI placement, iterate on playtests. |
| **IP** — item names, text and boss names are Chronocle's | Fine for a personal/learning project. **Before a public release, rename content and use our own art.** |

## 8. Decisions (2026-09-23)
1. **Stack:** TS + Vite + React DOM UI + Canvas 2D — approved.
2. **Art:** placeholders now (pixel-bitmap icons in `src/ui/icons.ts`, letter glyphs for items), real sprites after the MVP.
3. **Personal project**, not publishing — original item/boss names and text are fine to use as-is.
