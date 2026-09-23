import { createRng, type Rng } from '../rng'
import { CONTENT } from '../../data/content'
import { chestOptions, DIAMOND_CHANCE, drawDistinct, GOLDEN_CHANCE, rollTier, weaponPileOptions } from './loot'

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
