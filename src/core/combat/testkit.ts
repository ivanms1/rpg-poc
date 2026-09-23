/** Test fixtures for combat specs. Not used at runtime. */
import { DEFAULT_RULES, type Rules } from '../rules'
import { createBattle } from './state'
import type { BaseStats, BattleEvent, BattleState, Combatant, Side, Source } from './types'

export const stats = (maxHp: number, attack = 0, armor = 0, speed = 0): BaseStats => ({ maxHp, attack, armor, speed })

export const combatant = (name: string, base: BaseStats, sources: readonly Source[] = [], extra: Partial<Combatant> = {}): Combatant => ({
  name,
  stats: base,
  sources,
  ...extra,
})

export const battle = (player: Combatant, enemy: Combatant, rules: Partial<Rules> = {}): BattleState =>
  createBattle(player, enemy, { ...DEFAULT_RULES, ...rules })

export const source = (name: string, spec: Omit<Source, 'id' | 'name' | 'kind'> & { kind?: Source['kind'] }): Source => ({
  id: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  kind: spec.kind ?? 'item',
  ...spec,
})

export const eventsOf = <T extends BattleEvent['type']>(events: readonly BattleEvent[], type: T) =>
  events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type)

export const damageTo = (events: readonly BattleEvent[], side: Side) => eventsOf(events, 'damage').filter((e) => e.side === side)
