import { revealAround } from './fog'
import { farReveal } from './reveal'

const hero = { x: 20, y: 20 }
const start = revealAround(new Set(), hero.x, hero.y, 5)

describe('farReveal', () => {
  it('ignores walking, which only reveals within sight', () => {
    const stepped = revealAround(start, hero.x + 1, hero.y, 5)
    expect(farReveal(start, stepped, { x: hero.x + 1, y: hero.y }, 5)).toBeNull()
  })

  it('ignores no change at all', () => {
    expect(farReveal(start, start, hero, 5)).toBeNull()
    expect(farReveal(start, new Set(start), hero, 5)).toBeNull()
  })

  it('a lookout reveal spreads from the hero standing inside it', () => {
    const after = revealAround(start, hero.x, hero.y, 11)
    const reveal = farReveal(start, after, hero, 5)
    expect(reveal?.center).toEqual(hero)
    expect(reveal?.tiles.length).toBe(after.size - start.size)
    expect(reveal?.radius).toBeGreaterThan(10)
    expect(reveal?.radius).toBeLessThanOrEqual(12)
  })

  it('a far-off vision spreads from its own middle', () => {
    const after = revealAround(start, 40, 8, 3)
    const reveal = farReveal(start, after, hero, 5)
    expect(reveal?.center).toEqual({ x: 40, y: 8 })
    expect(reveal?.tiles.every((t) => Math.abs(t.x - 40) <= 3 && Math.abs(t.y - 8) <= 3)).toBe(true)
    expect(reveal?.radius).toBeCloseTo(Math.hypot(3, 1))
  })

  it('a teleport that reveals around the hero is not a far reveal', () => {
    const there = { x: 50, y: 50 }
    expect(farReveal(start, revealAround(start, there.x, there.y, 3), there, 5)).toBeNull()
  })
})
