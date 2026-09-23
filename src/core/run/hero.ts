/** Pure inventory and health helpers for the hero between battles. */
import type { Combatant } from '../combat/types'
import { buildPlayer, type Equipped, type Loadout } from '../items/loadout'
import type { SetDef } from '../items/types'
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

/** Sets health, clamped to [0, max health from current gear]. */
export const withHealth = (hero: Hero, hp: number): Hero => ({ ...hero, hp: Math.max(0, Math.min(hp, heroMaxHp(hero))) })

/** After a gear change: gained max health is also gained as health; lost max health caps it. */
const refit = (before: Hero, after: Hero): Hero => {
  const gained = Math.max(0, heroMaxHp(after) - heroMaxHp(before))
  return withHealth(after, after.hp + gained)
}

/** Puts `equipped` in the first empty slot, or returns null when all slots are full. */
export const placeItem = (hero: Hero, equipped: Equipped): Hero | null => {
  const slot = hero.items.indexOf(null)
  if (slot === -1) return null
  return refit(hero, { ...hero, items: hero.items.map((e, i) => (i === slot ? equipped : e)) })
}

export const discardItem = (hero: Hero, slot: number): Hero => {
  if (slot < 0 || slot >= hero.items.length || hero.items[slot] === null) return hero
  return refit(hero, { ...hero, items: hero.items.map((e, i) => (i === slot ? null : e)) })
}

/** A new weapon arrives bare: blade oils and the forge edge stay with the old one. */
export const equipWeapon = (hero: Hero, weapon: Equipped): Hero => refit(hero, { ...hero, weapon, oils: [], edge: null })

/** Swaps two item slots (slot order is trigger order). */
export const swapSlots = (hero: Hero, from: number, to: number): Hero => {
  const inRange = (i: number) => i >= 0 && i < hero.items.length
  if (from === to || !inRange(from) || !inRange(to)) return hero
  return { ...hero, items: hero.items.map((e, i) => (i === from ? hero.items[to] ?? null : i === to ? hero.items[from] ?? null : e)) }
}

export const addSlots = (hero: Hero, count: number): Hero => ({ ...hero, items: [...hero.items, ...Array.from({ length: count }, () => null)] })
