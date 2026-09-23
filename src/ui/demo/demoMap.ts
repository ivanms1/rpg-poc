import { createRng, nextFloat, nextInt, type Rng } from '../../core/rng'
import type { TileName } from '../../render/tiles'

/**
 * Throwaway scatter map for the Phase 0 layout mock. Real generation (biomes, autotiled
 * paths/rivers, POI rules) replaces this in Phase 3 — see docs/PLAN.md.
 */
export type PoiKind = 'enemy' | 'shop' | 'shrine'

export interface Poi {
  readonly x: number
  readonly y: number
  readonly kind: PoiKind
  readonly tile: TileName
}

export interface DemoMap {
  readonly width: number
  readonly height: number
  readonly tiles: readonly (TileName | null)[]
  readonly pois: readonly Poi[]
  readonly start: { readonly x: number; readonly y: number }
}

const FOREST: readonly [TileName, number][] = [['pine', 0.22], ['pines', 0.08], ['rock', 0.08], ['tuft', 0.1], ['sprouts', 0.05]]
const SWAMP: readonly [TileName, number][] = [['tallGrass', 0.2], ['deadTree', 0.12], ['mushrooms', 0.03], ['tuft', 0.05]]

const weightedPick = (rng: Rng, table: readonly [TileName, number][]): [TileName | null, Rng] => {
  const [roll, next] = nextFloat(rng)
  let acc = 0
  for (const [name, weight] of table) {
    acc += weight
    if (roll < acc) return [name, next]
  }
  return [null, next]
}

const isPath = (x: number, y: number, w: number, h: number): boolean =>
  y === Math.floor(h / 2) || x === Math.floor(w / 2) || (y === 8 && x > w / 2) || (x === 12 && y < h / 2)

const isWater = (x: number, y: number, w: number): boolean => Math.abs(x - Math.floor(w * 0.3) - Math.round(Math.sin(y / 3) * 2)) < 1

export const createDemoMap = (seed: number, width = 60, height = 40): DemoMap => {
  let rng = createRng(seed)
  const tiles: (TileName | null)[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isPath(x, y, width, height)) {
        tiles.push('pathFill')
      } else if (isWater(x, y, width)) {
        tiles.push('waterFill')
      } else {
        const [name, next] = weightedPick(rng, x < width * 0.3 ? SWAMP : FOREST)
        tiles.push(name)
        rng = next
      }
    }
  }

  const poiTable: readonly [PoiKind, TileName][] = [
    ['enemy', 'skull'], ['enemy', 'skull'], ['enemy', 'skull'], ['enemy', 'skull'],
    ['shop', 'chest'], ['shop', 'tent'], ['shrine', 'grave'], ['shop', 'chest'],
  ]
  const pois: Poi[] = poiTable.map(([kind, tile]) => {
    const [x, r1] = nextInt(rng, 2, width - 3)
    const [y, r2] = nextInt(r1, 2, height - 3)
    rng = r2
    return { x, y, kind, tile }
  })

  return { width, height, tiles, pois, start: { x: Math.floor(width / 2), y: Math.floor(height / 2) } }
}

export const tileAt = (map: DemoMap, x: number, y: number): TileName | null =>
  x < 0 || y < 0 || x >= map.width || y >= map.height ? null : map.tiles[y * map.width + x] ?? null
