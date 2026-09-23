import { ALL, autotileBitmap, E, maskOf, N, NE, NW, S, SE, SW, W } from './autotile'

const px = (bitmap: readonly boolean[], x: number, y: number) => bitmap[y * 10 + x]

describe('maskOf', () => {
  it('sets a bit per matching neighbour', () => {
    expect(maskOf((dx, dy) => dx === 0 && dy === -1)).toBe(N)
    expect(maskOf(() => true)).toBe(ALL)
    expect(maskOf(() => false)).toBe(0)
  })
})

describe('autotileBitmap', () => {
  it('is 10×10', () => {
    expect(autotileBitmap(0, { dots: false })).toHaveLength(100)
  })

  it('fills the whole tile when surrounded, apart from dots', () => {
    const plain = autotileBitmap(ALL, { dots: false })
    expect(plain.every(Boolean)).toBe(true)
    const dotted = autotileBitmap(ALL, { dots: true })
    expect(dotted.filter((on) => !on).length).toBeGreaterThan(0)
    expect(px(dotted, 0, 0)).toBe(true)
  })

  it('opens the edge toward a missing neighbour', () => {
    const noNorth = autotileBitmap(E | S | W | SE | SW, { dots: false })
    expect(px(noNorth, 5, 0)).toBe(false)
    expect(px(noNorth, 5, 9)).toBe(true)
  })

  it('connects flush to present neighbours', () => {
    const horizontal = autotileBitmap(E | W, { dots: false })
    expect(px(horizontal, 0, 5)).toBe(true)
    expect(px(horizontal, 9, 5)).toBe(true)
    expect(px(horizontal, 5, 0)).toBe(false)
    expect(px(horizontal, 5, 9)).toBe(false)
  })

  it('rounds outer corners and notches inner corners', () => {
    const isolated = autotileBitmap(0, { dots: false })
    expect(px(isolated, 1, 1)).toBe(false)
    expect(px(isolated, 5, 5)).toBe(true)
    const innerCorner = autotileBitmap(ALL & ~NW, { dots: false })
    expect(autotileBitmap(N | E | S | W | NE | SE | SW, { dots: false })).toEqual(innerCorner)
    expect(px(innerCorner, 0, 0)).toBe(false)
    expect(px(innerCorner, 9, 0)).toBe(true)
  })

  it('a vertical path is open on both sides and flush top and bottom', () => {
    const bitmap = autotileBitmap(N | S, { dots: false })
    for (let y = 0; y < 10; y++) {
      expect(px(bitmap, 0, y)).toBe(false)
      expect(px(bitmap, 9, y)).toBe(false)
    }
    expect(px(bitmap, 5, 0)).toBe(true)
    expect(px(bitmap, 5, 9)).toBe(true)
  })
})
