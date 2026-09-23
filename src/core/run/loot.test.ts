import { createRng, type Rng } from '../rng'
import { CONTENT } from '../../data/content'
import { chestOptions, DIAMOND_CHANCE, drawDistinct, forgeOptions, GOLDEN_CHANCE, graveOptions, jewelryOptions, rollTier, shopStock, weaponPileOptions } from './loot'

describe('drawDistinct', () => {
  it('draws n distinct elements deterministically', () => {
    const [a] = drawDistinct(createRng(1), [1, 2, 3, 4, 5], 3)
    const [b] = drawDistinct(createRng(1), [1, 2, 3, 4, 5], 3)
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(3)
  })

  it('returns the whole pool when it is smaller than n', () => {
    expect(drawDistinct(createRng(1), ['x'], 3)[0]).toEqual(['x'])
  })
})

describe('rollTier', () => {
  it('matches the chest odds (1/80 golden, 1/500 diamond)', () => {
    let rng: Rng = createRng(123)
    const counts = { normal: 0, golden: 0, diamond: 0 }
    const n = 50_000
    for (let i = 0; i < n; i++) {
      const [tier, next] = rollTier(rng)
      counts[tier]++
      rng = next
    }
    expect(counts.golden / n).toBeCloseTo(GOLDEN_CHANCE, 2)
    expect(counts.diamond / n).toBeCloseTo(DIAMOND_CHANCE, 2)
  })
})

describe('chestOptions', () => {
  it('offers 3 distinct common items', () => {
    const [options] = chestOptions(createRng(9), CONTENT)
    expect(options).toHaveLength(3)
    expect(new Set(options.map((o) => o.item.id)).size).toBe(3)
    expect(options.every((o) => o.item.rarity === 'common' && o.item.kind === 'item')).toBe(true)
  })
})

describe('weaponPileOptions', () => {
  it('offers 3 distinct rare or heroic weapons', () => {
    const [options] = weaponPileOptions(createRng(9), CONTENT)
    expect(options).toHaveLength(3)
    expect(options.every((o) => o.item.kind === 'weapon' && ['rare', 'heroic'].includes(o.item.rarity))).toBe(true)
  })
})

describe('uniqueness and new locations', () => {
  const ownedHeroic = ['frozen-iceblade', 'twin-blade', 'lifesteal-scythe', 'stoneslab-sword', 'quickgrowth-spear', 'brittlebark-club']

  it('rare and better items already owned are never offered again', () => {
    for (let seed = 1; seed < 30; seed++) {
      const [options] = weaponPileOptions(createRng(seed), CONTENT, new Set(ownedHeroic))
      expect(options.some((o) => ownedHeroic.includes(o.item.id))).toBe(false)
    }
  })

  it('a grave offers 3 heroic items', () => {
    const [options] = graveOptions(createRng(3), CONTENT, new Set())
    expect(options).toHaveLength(3)
    expect(options.every((o) => o.item.rarity === 'heroic' && o.item.kind === 'item')).toBe(true)
  })

  it('a jewelry box offers 3 jewelry items', () => {
    const [options] = jewelryOptions(createRng(3), CONTENT, new Set())
    expect(options).toHaveLength(3)
    expect(options.every((o) => o.item.tags.includes('jewelry'))).toBe(true)
  })

  it('a merchant stocks 5 rares at 3 or 5 gold and 1 heroic at 10', () => {
    const [stock] = shopStock(createRng(4), CONTENT, new Set())
    expect(stock).toHaveLength(6)
    expect(stock.slice(0, 5).every((s) => s.equipped.item.rarity === 'rare' && [3, 5].includes(s.price))).toBe(true)
    expect(stock[5]).toMatchObject({ price: 10, sold: false })
    expect(stock[5]?.equipped.item.rarity).toBe('heroic')
    expect(new Set(stock.map((s) => s.equipped.item.id)).size).toBe(6)
  })

  it('a forge offers 2 distinct edges', () => {
    const [edges] = forgeOptions(createRng(4), CONTENT)
    expect(edges).toHaveLength(2)
    expect(edges[0]?.id).not.toBe(edges[1]?.id)
  })
})
