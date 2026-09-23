/** Key sequences for e2e tests, computed from the same seeded map generator the game uses. */
import { tileKey } from '../src/core/world/fog'
import { generateWorld } from '../src/core/world/mapgen'
import { findPath } from '../src/core/world/pathing'
import { isWalkable } from '../src/core/world/terrain'
import type { Point } from '../src/core/world/types'


const KEY: Record<string, string> = { '0,-1': 'w', '1,0': 'd', '0,1': 's', '-1,0': 'a' }

const toKeys = (from: Point, path: readonly Point[]): string =>
  path.reduce<[string, Point]>(([keys, prev], p) => [keys + KEY[`${p.x - prev.x},${p.y - prev.y}`], p], ['', from])[0]

/** Things you can walk to: a location kind ('chest', 'merchant'…) or `enemy:<id>`. */
const describe = (seed: number) => {
  const world = generateWorld(seed)
  const things = [...world.pois.map((p) => ({ ...p, tag: p.kind as string })), ...world.enemies.map((e) => ({ ...e, tag: `enemy:${e.enemyId}` }))]
  return { world, things }
}

/** Keys that walk from the start to the nearest match, stepping on nothing else on the way. */
export const routeTo = (seed: number, match: (tag: string) => boolean): string => {
  const { world, things } = describe(seed)
  const routes = things
    .filter((t) => match(t.tag))
    .map((t) => {
      const blocked = new Set(things.filter((o) => o !== t).map((o) => tileKey(o.x, o.y)))
      return findPath(world.map, world.start, t, blocked)
    })
    .filter((p): p is Point[] => p !== null)
    .sort((a, b) => a.length - b.length)
  const best = routes[0]
  if (!best) throw new Error(`seed ${seed}: no clean route to a matching target`)
  return toKeys(world.start, best)
}

/** Two keys that step to a free neighbour of the start and back. */
export const paceKeys = (seed: number): [string, string] => {
  const { world, things } = describe(seed)
  const taken = new Set(things.map((t) => tileKey(t.x, t.y)))
  const back: Record<string, string> = { w: 's', s: 'w', a: 'd', d: 'a' }
  for (const [delta, key] of Object.entries(KEY)) {
    const [dx = 0, dy = 0] = delta.split(',').map(Number)
    const x = world.start.x + dx
    const y = world.start.y + dy
    if (isWalkable(world.map, x, y) && !taken.has(tileKey(x, y))) return [key, back[key] as string]
  }
  throw new Error(`seed ${seed}: the start has no free neighbour`)
}

/** Targets the e2e specs walk to. */
export const TARGETS = {
  enemy: (tag: string) => tag === 'enemy:spider' || tag === 'enemy:wolf',
  chest: (tag: string) => tag === 'chest',
  merchant: (tag: string) => tag === 'merchant',
  forge: (tag: string) => tag === 'forge',
  bladeOil: (tag: string) => tag === 'bladeOil',
} as const

const works = (seed: number): boolean => {
  try {
    paceKeys(seed)
    return Object.values(TARGETS).every((match) => routeTo(seed, match).length <= 60)
  } catch {
    return false
  }
}

/**
 * The seed every e2e test plays: the first one with clean routes to every target. Chosen at load
 * time from the real generator, so map changes never break the tests' walking.
 */
export const SEED: number = (() => {
  for (let seed = 1; seed < 2000; seed++) if (works(seed)) return seed
  throw new Error('no seed has clean routes to every e2e target')
})()
