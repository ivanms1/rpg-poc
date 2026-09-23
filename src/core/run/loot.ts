/** What locations offer. Odds: docs/research/mechanics.md §8. */
import type { Equipped } from '../items/loadout'
import type { ItemDef, Tier } from '../items/types'
import { nextFloat, nextInt, type Rng } from '../rng'
import type { Content } from './types'

export const GOLDEN_CHANCE = 1 / 80
export const DIAMOND_CHANCE = 1 / 500
const CHOICES = 3

export const rollTier = (rng: Rng): [Tier, Rng] => {
  const [roll, next] = nextFloat(rng)
  if (roll < DIAMOND_CHANCE) return ['diamond', next]
  if (roll < DIAMOND_CHANCE + GOLDEN_CHANCE) return ['golden', next]
  return ['normal', next]
}

/** Up to `n` distinct elements, in draw order. */
export const drawDistinct = <T>(rng: Rng, pool: readonly T[], n: number): [T[], Rng] => {
  let remaining = [...pool]
  let current = rng
  const drawn: T[] = []
  while (drawn.length < n && remaining.length > 0) {
    const [index, next] = nextInt(current, 0, remaining.length - 1)
    drawn.push(remaining[index] as T)
    remaining = remaining.filter((_, i) => i !== index)
    current = next
  }
  return [drawn, current]
}

const withTiers = (rng: Rng, defs: readonly ItemDef[]): [Equipped[], Rng] =>
  defs.reduce<[Equipped[], Rng]>(
    ([acc, r], item) => {
      const [tier, next] = item.rarity === 'common' ? rollTier(r) : ['normal' as const, r]
      return [[...acc, { item, tier }], next]
    },
    [[], rng],
  )

/** Treasure Chest: choose 1 of 3 common items (1/80 golden, 1/500 diamond). */
export const chestOptions = (rng: Rng, content: Content): [Equipped[], Rng] => {
  const pool = content.items.filter((i) => i.rarity === 'common')
  const [defs, next] = drawDistinct(rng, pool, CHOICES)
  return withTiers(next, defs)
}

/** Weapon Pile: choose 1 of 3 rare or heroic weapons. */
export const weaponPileOptions = (rng: Rng, content: Content): [Equipped[], Rng] => {
  const pool = content.weapons.filter((w) => w.rarity === 'rare' || w.rarity === 'heroic')
  const [defs, next] = drawDistinct(rng, pool, CHOICES)
  return withTiers(next, defs)
}
