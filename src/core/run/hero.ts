/** Pure inventory and health helpers for the hero between battles. */
import type { Combatant } from '../combat/types'
import { buildPlayer, type Equipped } from '../items/loadout'
import type { Hero } from './types'

export const heroCombatant = (hero: Hero): Combatant =>
  buildPlayer({ weapon: hero.weapon, items: hero.items, hp: hero.hp, gold: hero.gold, baseHealth: hero.baseHealth })

export const heroMaxHp = (hero: Hero): number =>
  buildPlayer({ weapon: hero.weapon, items: hero.items, baseHealth: hero.baseHealth }).stats.maxHp

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

export const equipWeapon = (hero: Hero, weapon: Equipped): Hero => refit(hero, { ...hero, weapon })

export const addSlots = (hero: Hero, count: number): Hero => ({ ...hero, items: [...hero.items, ...Array.from({ length: count }, () => null)] })
