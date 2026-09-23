import { createRng, nextFloat, nextInt, pick } from './rng'

const drawFloats = (seed: number, count: number): number[] => {
  const values: number[] = []
  let rng = createRng(seed)
  for (let i = 0; i < count; i++) {
    const [value, next] = nextFloat(rng)
    values.push(value)
    rng = next
  }
  return values
}

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    expect(drawFloats(42, 5)).toEqual(drawFloats(42, 5))
  })

  it('produces different sequences for different seeds', () => {
    expect(drawFloats(1, 5)).not.toEqual(drawFloats(2, 5))
  })

  it('returns floats in [0, 1)', () => {
    for (const value of drawFloats(7, 1000)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('does not mutate the input state', () => {
    const rng = createRng(99)
    const [first] = nextFloat(rng)
    const [again] = nextFloat(rng)
    expect(again).toBe(first)
  })

  it('nextInt stays within inclusive bounds and hits both ends', () => {
    let rng = createRng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) {
      const [value, next] = nextInt(rng, 2, 5)
      seen.add(value)
      rng = next
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5])
  })

  it('nextInt rejects an inverted range', () => {
    expect(() => nextInt(createRng(1), 5, 2)).toThrow(RangeError)
  })

  it('pick returns an element of the array', () => {
    const items = ['a', 'b', 'c'] as const
    const [value] = pick(createRng(5), items)
    expect(items).toContain(value)
  })

  it('pick rejects an empty array', () => {
    expect(() => pick(createRng(1), [])).toThrow(RangeError)
  })
})
