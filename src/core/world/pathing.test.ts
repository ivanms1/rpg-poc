import { findPath, reachableFrom, stepToward } from './pathing'
import type { Terrain, WorldMap } from './types'

/** Builds a map from rows: '.' path, ',' open ground, '#' pine, '~' water, '=' bridge. */
const mapOf = (rows: readonly string[]): WorldMap => {
  const legend: Record<string, Terrain> = { '.': 'path', ',': 'ground', '#': 'pine', '~': 'water', '=': 'bridge' }
  const terrain = rows.flatMap((row) => [...row].map((ch) => legend[ch] ?? 'path'))
  return { width: rows[0]!.length, height: rows.length, terrain, biome: terrain.map(() => 'start') }
}

describe('reachableFrom', () => {
  it('floods walkable tiles only', () => {
    const map = mapOf([
      '..#..',
      '..#..',
      '.....',
    ])
    const seen = reachableFrom(map, { x: 0, y: 0 })
    expect(seen.has('4,0')).toBe(true)
    expect(seen.has('2,0')).toBe(false)
  })

  it('stays on paths: open ground blocks too', () => {
    const map = mapOf(['..,..'])
    expect(reachableFrom(map, { x: 0, y: 0 }).has('4,0')).toBe(false)
  })

  it('crosses bridges but not water', () => {
    const map = mapOf([
      '..~..',
      '..=..',
      '..~..',
    ])
    expect(reachableFrom(map, { x: 0, y: 0 }).has('4,2')).toBe(true)
    const noBridge = mapOf(['..~..', '..~..'])
    expect(reachableFrom(noBridge, { x: 0, y: 0 }).has('4,0')).toBe(false)
  })
})

describe('stepToward', () => {
  const open = mapOf(['.....', '.....', '.....'])

  it('moves one tile along the longer axis', () => {
    expect(stepToward(open, { x: 0, y: 0 }, { x: 4, y: 1 }, new Set())).toEqual({ x: 1, y: 0 })
    expect(stepToward(open, { x: 2, y: 0 }, { x: 2, y: 2 }, new Set())).toEqual({ x: 2, y: 1 })
  })

  it('goes around an obstacle on the other axis', () => {
    const map = mapOf(['.#...', '.....'])
    expect(stepToward(map, { x: 0, y: 0 }, { x: 3, y: 1 }, new Set())).toEqual({ x: 0, y: 1 })
  })

  it('avoids occupied tiles and stays put when stuck', () => {
    const map = mapOf(['.#', '#.'])
    expect(stepToward(map, { x: 0, y: 0 }, { x: 1, y: 1 }, new Set())).toEqual({ x: 0, y: 0 })
    expect(stepToward(open, { x: 0, y: 0 }, { x: 2, y: 0 }, new Set(['1,0']))).toEqual({ x: 0, y: 0 })
    expect(stepToward(open, { x: 0, y: 0 }, { x: 2, y: 1 }, new Set(['1,0']))).toEqual({ x: 0, y: 1 })
  })

  it('may step onto the target itself', () => {
    expect(stepToward(open, { x: 0, y: 0 }, { x: 1, y: 0 }, new Set())).toEqual({ x: 1, y: 0 })
  })
})

describe('findPath', () => {
  it('returns the shortest walkable route, excluding the start', () => {
    const map = mapOf([
      '...#.',
      '.#.#.',
      '.#...',
    ])
    const path = findPath(map, { x: 0, y: 0 }, { x: 4, y: 0 }, new Set())
    expect(path).toHaveLength(8)
    expect(path?.at(-1)).toEqual({ x: 4, y: 0 })
  })

  it('routes around blocked tiles but may end on a blocked target', () => {
    const map = mapOf(['.....', '.....'])
    const path = findPath(map, { x: 0, y: 0 }, { x: 2, y: 0 }, new Set(['1,0', '2,0']))
    expect(path).toEqual([{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 0 }])
  })

  it('returns null when unreachable and [] for the start itself', () => {
    const map = mapOf(['..#..'])
    expect(findPath(map, { x: 0, y: 0 }, { x: 4, y: 0 }, new Set())).toBeNull()
    expect(findPath(map, { x: 0, y: 0 }, { x: 0, y: 0 }, new Set())).toEqual([])
  })
})
