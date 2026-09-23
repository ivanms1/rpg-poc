import type { BaseStats, Combatant, Source } from '../combat/types'
import { TIER_MULTIPLIER, type CreatureDef, type EdgeDef, type ItemDef, type ItemStats, type LoadoutContext, type OilKind, type SetDef, type Tier } from './types'

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
  readonly oils?: readonly OilKind[]
  readonly edge?: EdgeDef | null
  /** Set definitions to check; the complete ones apply. */
  readonly sets?: readonly SetDef[]
}

const scaleOf = (tier: Tier = 'normal') => (n: number) => n * TIER_MULTIPLIER[tier]

export const describeItem = (item: ItemDef, tier: Tier = 'normal'): string =>
  item.text.replace(/\{(-?\d+)\}/g, (_, n: string) => String(Number(n) * TIER_MULTIPLIER[tier]))

const NO_CONTEXT: LoadoutContext = { tagCount: () => 0, emptySlots: 0 }

export const loadoutContext = (loadout: Loadout): LoadoutContext => {
  const gear = [loadout.weapon, ...loadout.items].filter((g): g is Equipped => g !== null)
  return {
    tagCount: (tag) => gear.filter((g) => g.item.tags.includes(tag)).length,
    emptySlots: loadout.items.filter((e) => e === null).length,
  }
}

export const toSource = ({ item, tier }: Equipped, slot: number, ctx: LoadoutContext = NO_CONTEXT): Source => ({
  id: `${item.id}#${slot}`,
  name: item.name,
  kind: item.kind,
  text: describeItem(item, tier),
  ...(item.effect?.(scaleOf(tier), ctx) ?? {}),
})

const addItemStats = (base: BaseStats, s: ItemStats, x: (n: number) => number = (n) => n): BaseStats => ({
  maxHp: base.maxHp + x(s.health ?? 0),
  attack: base.attack + x(s.attack ?? 0),
  armor: base.armor + x(s.armor ?? 0),
  speed: base.speed + x(s.speed ?? 0),
})

const equippedIds = (loadout: Loadout): ReadonlySet<string> =>
  new Set([loadout.weapon?.item.id, ...loadout.items.map((e) => e?.item.id), loadout.edge?.id].filter((id): id is string => id !== undefined))

/** Sets whose every part is currently equipped. */
export const activeSets = (loadout: Loadout, sets: readonly SetDef[]): readonly SetDef[] => {
  const ids = equippedIds(loadout)
  return sets.filter((set) => set.parts.every((part) => ids.has(part)))
}

const SOURCE_ORDER: Record<Source['kind'], number> = { trait: 0, weapon: 1, edge: 2, item: 3, set: 4 }

const OIL_STATS: Record<OilKind, ItemStats> = { attack: { attack: 1 }, armor: { armor: 1 }, speed: { speed: 1 } }

/** Sums base stats from gear, oils and sets; sources are ordered weapon → edge → items by slot → sets. */
export const buildPlayer = (loadout: Loadout): Combatant => {
  const gear = [loadout.weapon, ...loadout.items].filter((g): g is Equipped => g !== null)
  const ctx = loadoutContext(loadout)
  const sets = activeSets(loadout, loadout.sets ?? [])
  const start: BaseStats = { maxHp: loadout.baseHealth ?? HERO_BASE_HEALTH, attack: 0, armor: 0, speed: 0 }
  const withGear = gear.reduce((acc, g) => addItemStats(acc, g.item.stats, scaleOf(g.tier)), start)
  const withOils = (loadout.oils ?? []).reduce((acc, oil) => addItemStats(acc, OIL_STATS[oil]), withGear)
  const withSets = sets.reduce((acc, set) => addItemStats(acc, set.stats ?? {}), withOils)
  const stats = gear.reduce((acc, g) => g.item.baseModifier?.(acc, ctx, scaleOf(g.tier)) ?? acc, withSets)
  const edge: Source[] = loadout.edge ? [{ id: `edge:${loadout.edge.id}`, name: loadout.edge.name, kind: 'edge', text: loadout.edge.text, ...loadout.edge.effect() }] : []
  const setSources: Source[] = sets.map((set) => ({ id: `set:${set.id}`, name: set.name, kind: 'set', text: set.text, ...(set.effect?.() ?? {}) }))
  return {
    name: 'Hero',
    stats: { ...stats, maxHp: Math.max(1, stats.maxHp) },
    hp: loadout.hp,
    gold: loadout.gold ?? 0,
    sources: [...gear.map((g, slot) => toSource(g, slot, ctx)), ...edge, ...setSources].sort((a, b) => SOURCE_ORDER[a.kind] - SOURCE_ORDER[b.kind]),
  }
}

export const creatureCombatant = (def: CreatureDef): Combatant => ({
  name: def.name,
  stats: def.stats,
  sources: def.trait ? [{ id: def.id, name: def.name, kind: 'trait', text: def.text, ...def.trait }] : [],
})

export interface SetProgress {
  readonly set: SetDef
  readonly owned: number
  readonly total: number
}

/** Sets that include `partId`, with how many of their parts are equipped. */
export const setProgress = (loadout: Loadout, sets: readonly SetDef[], partId: string): readonly SetProgress[] => {
  const ids = equippedIds(loadout)
  return sets
    .filter((set) => set.parts.includes(partId))
    .map((set) => ({ set, owned: set.parts.filter((p) => ids.has(p)).length, total: set.parts.length }))
}
