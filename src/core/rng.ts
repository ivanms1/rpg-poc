/**
 * Seeded, immutable PRNG (mulberry32). Every draw returns `[value, nextRng]`
 * so RNG state can live inside serialisable game state and runs replay exactly.
 */
export interface Rng {
  readonly state: number
}

export const createRng = (seed: number): Rng => ({ state: seed >>> 0 })

export const nextFloat = (rng: Rng): [number, Rng] => {
  const state = (rng.state + 0x6d2b79f5) >>> 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, { state }]
}

/** Integer in [min, max] inclusive. */
export const nextInt = (rng: Rng, min: number, max: number): [number, Rng] => {
  if (max < min) throw new RangeError(`nextInt: max (${max}) < min (${min})`)
  const [value, next] = nextFloat(rng)
  return [min + Math.floor(value * (max - min + 1)), next]
}

export const pick = <T>(rng: Rng, items: readonly T[]): [T, Rng] => {
  if (items.length === 0) throw new RangeError('pick: empty array')
  const [index, next] = nextInt(rng, 0, items.length - 1)
  return [items[index] as T, next]
}
