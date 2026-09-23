import type { Point, Terrain, WorldMap } from './types'

/** As in the original, the hero (and chasing enemies) can only walk on paths and bridges. */
const WALKABLE: ReadonlySet<Terrain> = new Set<Terrain>(['path', 'bridge'])

export const blocksMovement = (terrain: Terrain): boolean => !WALKABLE.has(terrain)

export const inBounds = (map: WorldMap, x: number, y: number): boolean => x >= 0 && y >= 0 && x < map.width && y < map.height

export const indexOf = (map: WorldMap, x: number, y: number): number => y * map.width + x

export const terrainAt = (map: WorldMap, x: number, y: number): Terrain | null =>
  inBounds(map, x, y) ? (map.terrain[indexOf(map, x, y)] ?? null) : null

export const isWalkable = (map: WorldMap, x: number, y: number): boolean => {
  const terrain = terrainAt(map, x, y)
  return terrain !== null && !blocksMovement(terrain)
}

export const manhattan = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
