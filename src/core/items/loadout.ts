import type { BaseStats, Combatant, Source } from '../combat/types'
import { TIER_MULTIPLIER, type CreatureDef, type ItemDef, type Tier } from './types'

export const HERO_BASE_HEALTH = 10

export interface Equipped {
  readonly item: ItemDef
  readonly tier?: Tier
}

export interface Loadout {
  readonly weapon: Equipped | null
  /** Slot order = trigger order. `null` = empty slot. */
  readonly items: readonly (Equipped | null)[]
  readonly hp?: number
  readonly gold?: number
  readonly baseHealth?: number
}

const scaleOf = (tier: Tier = 'normal') => (n: number) => n * TIER_MULTIPLIER[tier]

export const describeItem = (item: ItemDef, tier: Tier = 'normal'): string =>
  item.text.replace(/\{(-?\d+)\}/g, (_, n: string) => String(Number(n) * TIER_MULTIPLIER[tier]))

export const toSource = ({ item, tier }: Equipped, slot: number): Source => ({
  id: `${item.id}#${slot}`,
  name: item.name,
  kind: item.kind,
  text: describeItem(item, tier),
  ...(item.effect?.(scaleOf(tier)) ?? {}),
})

const addStats = (base: BaseStats, { item, tier }: Equipped): BaseStats => {
  const x = scaleOf(tier)
  const s = item.stats
  return {
    maxHp: base.maxHp + x(s.health ?? 0),
    attack: base.attack + x(s.attack ?? 0),
    armor: base.armor + x(s.armor ?? 0),
    speed: base.speed + x(s.speed ?? 0),
  }
}

/** Sums the hero's base stats from gear and orders sources weapon → items by slot. */
export const buildPlayer = (loadout: Loadout): Combatant => {
  const gear = [loadout.weapon, ...loadout.items].filter((g): g is Equipped => g !== null)
  const start: BaseStats = { maxHp: loadout.baseHealth ?? HERO_BASE_HEALTH, attack: 0, armor: 0, speed: 0 }
  const stats = gear.reduce(addStats, start)
  return {
    name: 'Hero',
    stats: { ...stats, maxHp: Math.max(1, stats.maxHp) },
    hp: loadout.hp,
    gold: loadout.gold ?? 0,
    sources: gear.map((g, slot) => toSource(g, slot)),
  }
}

export const creatureCombatant = (def: CreatureDef): Combatant => ({
  name: def.name,
  stats: def.stats,
  sources: def.trait ? [{ id: def.id, name: def.name, kind: 'trait', text: def.text, ...def.trait }] : [],
})
