import { revealAround } from '../core/world/fog'
import { farReveal } from '../core/world/reveal'
import { GLOW_MS, HOLD_MS, PAN_MS, RETURN_MS, planReveal, revealFrame } from './reveal'

const hero = { x: 20, y: 20 }
const before = revealAround(new Set(), hero.x, hero.y, 5)
const home = { px: 5, focus: hero }
/** A 382×222 map canvas at 4× stage scale. */
const W = 1528
const H = 888

const plan = (after: ReadonlySet<string>) => {
  const reveal = farReveal(before, after, hero, 5)
  if (!reveal) throw new Error('expected a far reveal')
  return { reveal, plan: planReveal(reveal, home, W, H) }
}

describe('reveal animation', () => {
  it('glides to a far vision at normal zoom, holds, then comes home', () => {
    const { plan: p } = plan(revealAround(before, 60, 5, 3))
    expect(p.away.px).toBe(home.px)
    expect(p.away.focus).toEqual({ x: 60, y: 5 })
    expect(revealFrame(p, before, 0)).toMatchObject({ px: 5, focus: hero, done: false })
    expect(revealFrame(p, before, PAN_MS + p.spreadMs + HOLD_MS / 2).focus).toEqual({ x: 60, y: 5 })
    expect(revealFrame(p, before, p.totalMs)).toMatchObject({ focus: hero, done: true })
    expect(p.totalMs).toBe(PAN_MS + p.spreadMs + HOLD_MS + RETURN_MS)
  })

  it('zooms out to fit a big lookout reveal', () => {
    const { plan: p } = plan(revealAround(before, hero.x, hero.y, 11))
    expect(p.away.px).toBeLessThan(home.px)
    expect(revealFrame(p, before, PAN_MS + 1).px).toBe(p.away.px)
    expect(p.spreadMs).toBeGreaterThan(1000)
  })

  it('the ring starts at the edge of what was already explored', () => {
    const { plan: p } = plan(revealAround(before, hero.x, hero.y, 11))
    expect(Math.min(...p.appearAt.values())).toBe(PAN_MS)
    expect(Math.max(...p.appearAt.values())).toBeCloseTo(PAN_MS + p.spreadMs)
  })

  it('tiles appear from the centre outwards and glow briefly', () => {
    const { reveal, plan: p } = plan(revealAround(before, hero.x, hero.y, 11))
    const near = reveal.tiles.find((t) => Math.hypot(t.x - hero.x, t.y - hero.y) < 7)!
    const far = reveal.tiles.find((t) => Math.hypot(t.x - hero.x, t.y - hero.y) > 10.5)!
    const nearAt = p.appearAt.get(near.key)!
    expect(nearAt).toBeLessThan(p.appearAt.get(far.key)!)
    expect(revealFrame(p, before, nearAt - 1).visible(near.key)).toBe(false)
    const shown = revealFrame(p, before, nearAt + GLOW_MS / 2)
    expect(shown.visible(near.key)).toBe(true)
    expect(shown.visible(far.key)).toBe(false)
    expect(shown.glow(near.key)).toBeCloseTo(0.5)
    expect(revealFrame(p, before, nearAt + GLOW_MS).glow(near.key)).toBe(0)
  })

  it('keeps what was already explored visible throughout', () => {
    const { plan: p } = plan(revealAround(before, 60, 5, 3))
    const known = [...before][0]!
    expect(revealFrame(p, before, 0).visible(known)).toBe(true)
    expect(revealFrame(p, before, 0).glow(known)).toBe(0)
    expect(revealFrame(p, before, 0).visible('999,999')).toBe(false)
  })
})
