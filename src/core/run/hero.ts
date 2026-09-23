/** Pure inventory and health helpers for the hero between battles. */
import type { Combatant } from '../combat/types'
import { buildPlayer, type Equipped, type Loadout } from '../items/loadout'
import type { ItemDef, SetDef } from '../items/types'
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

/** Equips a weapon or places an item; null when the item needs a slot and none is free. */
export const acquire = (hero: Hero, equipped: Equipped, sets: readonly SetDef[] = []): Hero | null =>
  equipped.item.kind === 'weapon' ? equipWeapon(hero, equipped, sets) : placeItem(hero, equipped, sets)

/** Swaps two item slots (slot order is trigger order). */
export const swapSlots = (hero: Hero, from: number, to: number): Hero => {
  const inRange = (i: number) => i >= 0 && i < hero.items.length
  if (from === to || !inRange(from) || !inRange(to)) return hero
  return { ...hero, items: hero.items.map((e, i) => (i === from ? hero.items[to] ?? null : i === to ? hero.items[from] ?? null : e)) }
}

export const addSlots = (hero: Hero, count: number): Hero => ({ ...hero, items: [...hero.items, ...Array.from({ length: count }, () => null)] })
