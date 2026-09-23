import { tileKey } from './fog'
import { isWalkable } from './terrain'
import type { Point, WorldMap } from './types'

const DIRS: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

/** Keys ("x,y") of every walkable tile reachable from `from` with 4-way steps. */
export const reachableFrom = (map: WorldMap, from: Point): ReadonlySet<string> => {
  const seen = new Set<string>([tileKey(from.x, from.y)])
  const queue: Point[] = [from]
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head] as Point
    for (const d of DIRS) {
      const next = { x: p.x + d.x, y: p.y + d.y }
      const key = tileKey(next.x, next.y)
      if (seen.has(key) || !isWalkable(map, next.x, next.y)) continue
      seen.add(key)
      queue.push(next)
    }
  }
  return seen
}

/**
 * One greedy chase step from `from` toward `to`: try the longer axis first, then the other.
 * Stays put if both are blocked. `occupied` holds keys of tiles other walkers stand on.
 */
export const stepToward = (map: WorldMap, from: Point, to: Point, occupied: ReadonlySet<string>): Point => {
  const dx = Math.sign(to.x - from.x)
  const dy = Math.sign(to.y - from.y)
  const horizontal = { x: from.x + dx, y: from.y }
  const vertical = { x: from.x, y: from.y + dy }
  const preferHorizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
  const options = (preferHorizontal ? [horizontal, vertical] : [vertical, horizontal]).filter(
    (p) => (p.x !== from.x || p.y !== from.y) && isWalkable(map, p.x, p.y) && !occupied.has(tileKey(p.x, p.y)),
  )
  return options[0] ?? from
}
