/** What locations offer. Odds: docs/research/mechanics.md §8. */
import type { Equipped } from '../items/loadout'
import type { EdgeDef, ItemDef, Tier } from '../items/types'
import { nextFloat, nextInt, type Rng } from '../rng'
import type { Content, ShopSlot } from './types'

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

/** Crafted-only items never drop; rare and better items are unique (never offered while owned). */
const available = (defs: readonly ItemDef[], owned: ReadonlySet<string>): readonly ItemDef[] =>
  defs.filter((d) => d.drop !== false && (d.rarity === 'common' || !owned.has(d.id)))

const offer = (rng: Rng, pool: readonly ItemDef[], owned: ReadonlySet<string>, n = CHOICES): [Equipped[], Rng] => {
  const [defs, next] = drawDistinct(rng, available(pool, owned), n)
  return withTiers(next, defs)
}

const NONE: ReadonlySet<string> = new Set()

/** Treasure Chest: choose 1 of 3 common items (1/80 golden, 1/500 diamond). */
export const chestOptions = (rng: Rng, content: Content): [Equipped[], Rng] =>
  offer(rng, content.items.filter((i) => i.rarity === 'common'), NONE)

/** Weapon Pile: choose 1 of 3 rare or heroic weapons. */
export const weaponPileOptions = (rng: Rng, content: Content, owned: ReadonlySet<string> = NONE): [Equipped[], Rng] =>
  offer(rng, content.weapons.filter((w) => w.rarity === 'rare' || w.rarity === 'heroic'), owned)

/** Hero's Grave: choose 1 of 3 heroic items. */
export const graveOptions = (rng: Rng, content: Content, owned: ReadonlySet<string>): [Equipped[], Rng] =>
  offer(rng, content.items.filter((i) => i.rarity === 'heroic'), owned)

/** Jewelry Box: choose 1 of 3 jewelry items. */
export const jewelryOptions = (rng: Rng, content: Content, owned: ReadonlySet<string>): [Equipped[], Rng] =>
  offer(rng, content.items.filter((i) => i.tags.includes('jewelry')), owned)

const RARE_PRICES = [3, 5] as const
const HEROIC_PRICE = 10
const RARES_IN_STOCK = 5

/** Traveling Merchant: 5 rares for 3 or 5 gold and 1 heroic for 10 (items and weapons). */
export const shopStock = (rng: Rng, content: Content, owned: ReadonlySet<string>): [ShopSlot[], Rng] => {
  const everything = [...content.items, ...content.weapons]
  const [rares, r1] = offer(rng, everything.filter((d) => d.rarity === 'rare'), owned, RARES_IN_STOCK)
  const [heroic, r2] = offer(r1, everything.filter((d) => d.rarity === 'heroic'), owned, 1)
  const [priced, r3] = rares.reduce<[ShopSlot[], Rng]>(
    ([acc, r], equipped) => {
      const [i, next] = nextInt(r, 0, RARE_PRICES.length - 1)
      return [[...acc, { equipped, price: RARE_PRICES[i] as number, sold: false }], next]
    },
    [[], r2],
  )
  return [[...priced, ...heroic.map((equipped) => ({ equipped, price: HEROIC_PRICE, sold: false }))], r3]
}

/** Forge: choose 1 of 2 edges. */
export const forgeOptions = (rng: Rng, content: Content): [EdgeDef[], Rng] => drawDistinct(rng, content.edges, 2)
