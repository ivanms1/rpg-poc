/** Pure inventory and health helpers for the hero between battles. */
import type { Combatant } from '../combat/types'
import { buildPlayer, type Equipped, type Loadout } from '../items/loadout'
import { TIER_MULTIPLIER, type ItemDef, type Recipe, type SetDef } from '../items/types'
import type { Hero } from './types'

const loadoutOf = (hero: Hero, sets: readonly SetDef[]): Loadout => ({
  weapon: hero.weapon,
  items: hero.items,
  baseHealth: hero.baseHealth,
  oils: hero.oils,
  edge: hero.edge,
  sets,
})

export const heroCombatant = (hero: Hero, sets: readonly SetDef[] = []): Combatant =>
  buildPlayer({ ...loadoutOf(hero, sets), hp: hero.hp, gold: hero.gold })

export const heroMaxHp = (hero: Hero, sets: readonly SetDef[] = []): number => buildPlayer(loadoutOf(hero, sets)).stats.maxHp

/** Sets health, clamped to [0, max health from current gear and sets]. */
export const withHealth = (hero: Hero, hp: number, sets: readonly SetDef[] = []): Hero => ({
  ...hero,
  hp: Math.max(0, Math.min(hp, heroMaxHp(hero, sets))),
})

/** After a gear change: gained max health is also gained as health; lost max health caps it. */
const refit = (before: Hero, after: Hero, sets: readonly SetDef[]): Hero => {
  const gained = Math.max(0, heroMaxHp(after, sets) - heroMaxHp(before, sets))
  return withHealth(after, after.hp + gained, sets)
}

/** Ids of everything equipped. */
export const ownedIds = (hero: Hero): ReadonlySet<string> =>
  new Set([hero.weapon?.item.id, ...hero.items.map((e) => e?.item.id)].filter((id): id is string => id !== undefined))

/** Rare and better items are unique: true if the hero already has this one. */
export const alreadyHas = (hero: Hero, item: ItemDef): boolean => item.rarity !== 'common' && ownedIds(hero).has(item.id)

/** Why the hero can't take `item` (a unique they own, or a second rose), or null if they can. */
export const blockedReason = (hero: Hero, item: ItemDef): string | null => {
  if (alreadyHas(hero, item)) return `You already have ${item.name}.`
  if (item.tags.includes('rose') && hero.items.some((e) => e?.item.tags.includes('rose'))) return 'You can only equip 1 rose.'
  return null
}

/** Gold per new day from items like Loose Change (tier-scaled). */
export const goldPerDay = (hero: Hero): number =>
  hero.items.reduce((sum, e) => sum + (e?.item.goldPerDay ?? 0) * TIER_MULTIPLIER[e?.tier ?? 'normal'], 0)

/** Puts `equipped` in the first empty slot, or returns null when all slots are full. */
export const placeItem = (hero: Hero, equipped: Equipped, sets: readonly SetDef[] = []): Hero | null => {
  const slot = hero.items.indexOf(null)
  if (slot === -1) return null
  return refit(hero, { ...hero, items: hero.items.map((e, i) => (i === slot ? equipped : e)) }, sets)
}

export const discardItem = (hero: Hero, slot: number, sets: readonly SetDef[] = []): Hero => {
  if (slot < 0 || slot >= hero.items.length || hero.items[slot] === null) return hero
  return refit(hero, { ...hero, items: hero.items.map((e, i) => (i === slot ? null : e)) }, sets)
}

/** A new weapon arrives bare: blade oils and the forge edge stay with the old one. */
export const equipWeapon = (hero: Hero, weapon: Equipped, sets: readonly SetDef[] = []): Hero =>
  refit(hero, { ...hero, weapon, oils: [], edge: null }, sets)

/** The merged weapon if picking up `incoming` while holding `held` completes a recipe. */
export const mergedWeapon = (held: Equipped | null, incoming: ItemDef, merges: readonly Recipe[]): ItemDef | null => {
  if (!held || incoming.kind !== 'weapon') return null
  const pair = [held.item.id, incoming.id]
  return merges.find((m) => pair.includes(m.a) && pair.includes(m.b) && m.a !== m.b)?.result ?? null
}

/** Equips a weapon (merging with the held one when a recipe matches) or places an item; null when no slot is free. */
export const acquire = (hero: Hero, equipped: Equipped, sets: readonly SetDef[] = [], merges: readonly Recipe[] = []): Hero | null => {
  if (equipped.item.kind !== 'weapon') return placeItem(hero, equipped, sets)
  const merged = mergedWeapon(hero.weapon, equipped.item, merges)
  return equipWeapon(hero, merged ? { item: merged } : equipped, sets)
}

/** Swaps two item slots (slot order is trigger order). */
export const swapSlots = (hero: Hero, from: number, to: number): Hero => {
  const inRange = (i: number) => i >= 0 && i < hero.items.length
  if (from === to || !inRange(from) || !inRange(to)) return hero
  return { ...hero, items: hero.items.map((e, i) => (i === from ? hero.items[to] ?? null : i === to ? hero.items[from] ?? null : e)) }
}

export const addSlots = (hero: Hero, count: number): Hero => ({ ...hero, items: [...hero.items, ...Array.from({ length: count }, () => null)] })

/** Shown when there's no free slot for a new item. */
export const INVENTORY_FULL = 'Your inventory is full — discard an item first (double-click it, or tap it and press Discard).'
