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

/**
 * Shortest 4-way path from `from` to `to` over walkable tiles, avoiding `blocked` keys except the
 * target itself. With `known`, only those tiles may be crossed (e.g. what the hero has seen).
 * Excludes `from`; `[]` when already there, `null` when unreachable.
 */
export const findPath = (map: WorldMap, from: Point, to: Point, blocked: ReadonlySet<string>, known?: ReadonlySet<string>): Point[] | null => {
  const goal = tileKey(to.x, to.y)
  const start = tileKey(from.x, from.y)
  if (start === goal) return []
  const prev = new Map<string, Point>()
  const seen = new Set<string>([start])
  const queue: Point[] = [from]
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head] as Point
    for (const d of DIRS) {
      const next = { x: p.x + d.x, y: p.y + d.y }
      const key = tileKey(next.x, next.y)
      if (seen.has(key) || !isWalkable(map, next.x, next.y) || (blocked.has(key) && key !== goal) || (known && !known.has(key))) continue
      seen.add(key)
      prev.set(key, p)
      if (key === goal) {
        const path: Point[] = [next]
        for (let cur = prev.get(key); cur && tileKey(cur.x, cur.y) !== start; cur = prev.get(tileKey(cur.x, cur.y))) path.unshift(cur)
        return path
      }
      queue.push(next)
    }
  }
  return null
}
