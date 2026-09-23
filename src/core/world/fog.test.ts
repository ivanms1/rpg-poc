import { inSight, revealAround, tileKey } from './fog'

describe('fog', () => {
  it('keys tiles as "x,y"', () => {
    expect(tileKey(3, -2)).toBe('3,-2')
  })

  it('sight is a rounded disc: edges in, corners out', () => {
    expect(inSight(0, 0, 3)).toBe(true)
    expect(inSight(3, 0, 3)).toBe(true)
    expect(inSight(0, -3, 3)).toBe(true)
    expect(inSight(2, 2, 3)).toBe(true)
    expect(inSight(3, 3, 3)).toBe(false)
    expect(inSight(4, 0, 3)).toBe(false)
  })

  it('reveals a disc around the player', () => {
    const revealed = revealAround(new Set(), 10, 10, 2)
    expect(revealed.size).toBe(21) // 5×5 minus the 4 corners
    expect(revealed.has('10,10')).toBe(true)
    expect(revealed.has('12,11')).toBe(true)
    expect(revealed.has('12,12')).toBe(false)
  })

  it('keeps previously revealed tiles and never mutates its input', () => {
    const before = new Set(['0,0'])
    const after = revealAround(before, 10, 10, 1)
    expect(after.has('0,0')).toBe(true)
    expect(before.size).toBe(1)
    expect(after).not.toBe(before)
  })

  it('returns the same set when nothing new is revealed', () => {
    const first = revealAround(new Set(), 5, 5, 2)
    expect(revealAround(first, 5, 5, 2)).toBe(first)
  })
})
