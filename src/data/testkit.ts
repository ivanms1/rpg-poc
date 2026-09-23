/** Helpers for content specs. Not used at runtime. */
import { simulateBattle } from '../core/combat/simulate'
import type { BattleEvent, BattleResult, Combatant, Side, Source } from '../core/combat/types'
import { buildPlayer, type Loadout } from '../core/items/loadout'
import type { Tier } from '../core/items/types'
import type { Rules } from '../core/rules'
import { ITEMS_BY_ID } from './items'
import { WEAPONS_BY_ID } from './weapons'

const must = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Error(`Unknown ${what}`)
  return value
}

export const hero = (weaponId: string | null, itemIds: readonly string[] = [], extra: Partial<Loadout> & { tier?: Tier } = {}): Combatant =>
  buildPlayer({
    weapon: weaponId ? { item: must(WEAPONS_BY_ID[weaponId], `weapon ${weaponId}`), tier: extra.tier } : null,
    items: itemIds.map((id) => ({ item: must(ITEMS_BY_ID[id], `item ${id}`), tier: extra.tier })),
    ...extra,
  })

export const dummy = (maxHp = 30, attack = 0, armor = 0, speed = 0, sources: readonly Source[] = []): Combatant => ({
  name: 'Dummy',
  stats: { maxHp, attack, armor, speed },
  sources,
})

export const fight = (player: Combatant, enemy: Combatant, rules: Partial<Rules> = {}): BattleResult =>
  simulateBattle(player, enemy, { fatigueStartRound: 6, ...rules })

/** Effects caused by `source` (trigger markers excluded). */
export const from = (events: readonly BattleEvent[], source: string): BattleEvent[] =>
  events.filter((e) => e.type !== 'trigger' && 'source' in e && e.source === source)

export const strikes = (events: readonly BattleEvent[], side: Side) =>
  events.flatMap((e) => (e.type === 'strike' && e.side === side ? [e.damage] : []))

/** Events up to (not including) the start of `side`'s `n`th turn. */
export const beforeTurn = (events: readonly BattleEvent[], side: Side, n: number): BattleEvent[] => {
  let seen = 0
  const end = events.findIndex((e) => e.type === 'turnStart' && e.side === side && ++seen === n)
  return end === -1 ? [...events] : events.slice(0, end)
}
