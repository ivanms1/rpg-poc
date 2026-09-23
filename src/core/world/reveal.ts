/** Spotting reveals that don't come from walking (Lookout Tower, Crystal Ball) so the UI can show them. */
import { inSight, tileKey } from './fog'
import type { Point } from './types'

export interface RevealedTile {
  readonly x: number
  readonly y: number
  readonly key: string
}

export interface Reveal {
  /** Where the revealed area spreads from: the hero if they're inside it, else its middle. */
  readonly center: Point
  readonly tiles: readonly RevealedTile[]
  /** Distance from `center` to the farthest new tile. */
  readonly radius: number
}

const parse = (key: string): RevealedTile => {
  const [x = 0, y = 0] = key.split(',').map(Number)
  return { x, y, key: tileKey(x, y) }
}

/**
 * The tiles newly revealed between two fog states, when at least one lies beyond the hero's sight
 * (walking only ever reveals within it). Null for ordinary steps, teleports and no change.
 */
export const farReveal = (before: ReadonlySet<string>, after: ReadonlySet<string>, hero: Point, sight: number): Reveal | null => {
  if (after === before || after.size <= before.size) return null
  const tiles = [...after].filter((key) => !before.has(key)).map(parse)
  if (tiles.every((t) => inSight(t.x - hero.x, t.y - hero.y, sight))) return null
  const xs = tiles.map((t) => t.x)
  const ys = tiles.map((t) => t.y)
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const heroInside = hero.x >= minX && hero.x <= maxX && hero.y >= minY && hero.y <= maxY
  const center = heroInside ? hero : { x: Math.round((minX + maxX) / 2), y: Math.round((minY + maxY) / 2) }
  const radius = Math.max(...tiles.map((t) => Math.hypot(t.x - center.x, t.y - center.y)))
  return { center, tiles, radius }
}
