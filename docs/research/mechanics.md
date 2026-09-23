# He is Coming — Rules Spec (engine reference)

Compiled 2026-09-23 from: archived official wiki (Jul–Sep 2025, via web.archive.org), official Steam patch notes
(Jun 2024 → Aug 2026, see `patch-notes.txt`), and the open-source Dart sim
[eseidel/he_is_coming](https://github.com/eseidel/he_is_coming) (`lib/src/battle.dart`, demo 0.3.x).
Content tables (items, enemies, bosses, sets) live in [content.md](content.md). Raw wiki dumps in `wiki-raw/`.

Tags: **[W]** wiki, **[PN]** patch notes, **[SIM]** eseidel sim, **[DECISION]** our call where sources are unclear.

---

## 1. Stats
| Stat | Rule |
|---|---|
| Health | Current / max. Reaching ≤ 0 loses the battle (checked immediately, even mid-trigger) [SIM][PN 2025-09-10]. **Persists between battles.** |
| Attack | Damage per strike. Can go negative via items; strike damage is floored at 0 [SIM]. |
| Armor | Absorbs damage 1:1 before health. **Resets to base value at every battle start** [W]. |
| Speed | Higher speed takes the first turn; **tie → player**. No other intrinsic effect [W]. |

- Hero base: 10 max HP (Hard) / 20 (Normal, since Oct 2025); 0 attack/armor/speed. All other stats come from gear [W][PN].
- Starting weapon: **Wooden Stick** (1 attack) [SIM].
- "Base" stat = sum from equipped gear; temporary in-battle buffs are not base.
- No XP / levels.

## 2. Battle loop
```
battleStart:  player Battle Start triggers → enemy Battle Start triggers
first = (player.speed >= enemy.speed) ? player : enemy      // compared AFTER battle start [SIM]
loop:
  actor.turnStart   -> Turn Start triggers, then poison tick, acid tick
  if actor.stun > 0: stun -= 1 (skip strike)  else: strike
  queued additional strikes (each consumes 1 stun if stunned) [PN 2025-09-10]
  actor.turnEnd     -> Turn End triggers, regen tick, riptide tick, freeze -1, thorns cleanup
  if either hp <= 0: end
  swap actor
turnNumber = floor(turnsTaken / 2) + 1   // rounds, not individual turns [SIM]
```
- **Trigger order on one fighter:** creature trait → weapon → weapon edge → items in slot order (1..N) → set bonuses [SIM, dev on Discord].
- **Winner** gains the loser's gold reward (regular enemy: 1 gold) [W].
- **Fatigue** (anti-stalemate): from turn 40, extra damage at 1 and growing +1 per turn [dev, Steam 2024-10-02]. [DECISION] apply to both fighters at their turn start, ignores armor.

## 3. Damage
- `armorLoss = min(armor, dmg); armor -= armorLoss; hp -= dmg - armorLoss` — used for strikes and "deal X damage" effects.
- "Lose health" effects bypass armor.
- Acid removes armor directly and is **not** "taking damage" [PN 2025-09-10].
- "Take damage", "lose armor", "lose health" are distinct events for triggers [PN 2025-10-02].
- Special per-item/boss modifiers: ignore armor, double damage to armor, etc. — implement as hooks.

## 4. Triggers
| Keyword | Rule |
|---|---|
| Battle Start | Before any action. |
| Turn Start / Turn End | Own turns only. |
| First Turn | Effect lasts for your first turn (e.g. "First Turn: on hit …"). |
| On Hit | Your **strike** hits. Item damage never triggers it. |
| Exposed | First time armor goes from >0 to 0. Once per battle (+1 per "additional time" modifier). Starting with 0 armor does not trigger. |
| Wounded | First time HP ≤ 50% of max. Once per battle. |
| Countdown N | Fires when a per-battle counter (decrements each own turn) hits 0. |
| Every other turn | [DECISION] odd turns 1,3,5… (tested by sim author) — keep behind a rule flag; wiki says 2,4,6. |
| Every N strikes | Nth, 2Nth… strike made by that fighter. |
| Symphony | Trigger another random Instrument item. |
| Next boss | One-shot effect after the next boss kill (upgrades, egg hatch). |
| Whenever … | Reacts to events: take damage, lose armor, gain status, restore health, etc. |

"Trigger 1 additional time" modifiers stack additively [PN 2025-10-28].

## 5. Status effects (integer stacks, additive)
| Status | Tick | Rule |
|---|---|---|
| Poison | Turn start | If armor == 0, take damage = stacks. Then −1 stack (decays even if armor blocked it). |
| Acid | Turn start | Lose armor = stacks (floor 0). No decay. Not "damage". |
| Regeneration | Turn end | Restore HP = stacks, then −1. |
| Riptide | Turn end | Once per turn: take 5 damage (armor absorbs), −1 stack. |
| Freeze | Turn end | While > 0, attack is halved ([DECISION] floor). −1 at turn end. |
| Stun | On strike | Skip strike, −1. Non-strike triggers still fire. Stuns gained between strikes apply immediately [PN 2026-03-05]. |
| Thorns | When struck | Deal damage = thorns to attacker after the strike + on-hit resolve. Removed at the end of the turn in which they fired, **only if they fired** (a stunned attacker leaves them). [DECISION] fire on every strike of a multi-strike turn. Don't fire if owner died [PN 2025-09-10]. |
| Purity | On removal | No natural decay. Per stack removed: +1 attack, restore 3 HP. |
| Powder | ? | Woodland bomb mechanic, rule not archived — defer. |

## 6. Overworld & time
- Week = 3 days + 3 nights → boss. Run = 3 weeks (week 3 boss is final) [W].
- Day: 50 steps, sight radius 5. Night: 30 steps, sight radius 3. Every step ticks the clock [W].
- One tile per step (WASD). Enemies static by day; at night an enemy that sees you moves 1 tile toward you per step.
- Touching an enemy tile starts combat; no fleeing.
- Enemy stats scale by week (level 1/2/3 tables in content.md).
- Boss can be fought early (doesn't skip time). Tab previews boss stats.
- Sleep: Home (full heal) or Campfire (+10 HP) at night → skip to morning.

## 7. Inventory
- 1 weapon slot + 4 item slots; **+2 item slots per boss defeated** (4 → 6 → 8) [W].
- Picking up a new weapon replaces the old one (unless a weapon-modification combo applies).
- Slots are reorderable; order = trigger order. Double-click discards.
- Rarities: Common, Rare, Heroic, Mythic, Cursed. Rare+ are unique (max 1 copy) [PN 2025-10-28].
- Quality: Normal / Golden (numbers ×2) / Diamond (×4). Golem merges 2 identical commons up a tier.
- Sets auto-activate when all parts are equipped.
- Blade oils: +1 atk / +1 armor / +1 speed, each once per weapon. Forge: pick 1 of 2 edges.

## 8. Map locations (MVP subset in **bold**)
**Treasure Chest** (1 of 3 commons; 1/80 golden, 1/500 diamond) · **Campfire** · **Home** · **Traveling Merchant**
(5 rares 3–5g, 1 heroic 10g, reroll 1g +1) · **Blade Oil** · **Forge** · **Weapon Pile** · **Hero's Grave**
(1 of 3 heroic, opens at night) · **Jewelry Box** · Golem · Cauldron · Crystal Ball · Lookout Tower · Waypoint ·
Fairy · Wishing Well · Bargaining Tent · Woodcutter · Rune Stone · Crone.

## 9. Open questions (rule flags in code, defaults above)
1. Freeze rounding. 2. Every-other-turn parity. 3. Exact fatigue formula. 4. Thorns per multi-strike.
5. Speed compared before/after Battle Start. 6. Negative stat flooring. 7. Powder. 8. Miniboss scaling.
