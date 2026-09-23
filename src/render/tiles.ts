import type { PaletteColor } from './palette'

/** Bountiful Bits sheet: 33×57 tiles of 10×10px. Coordinates are [col, row]. */
export const TILE_SIZE = 10
export const TILESET_URL = '/tiles/bountiful-1bit.png'

export interface TileDef {
  readonly col: number
  readonly row: number
  readonly color: PaletteColor
}

const tile = (col: number, row: number, color: PaletteColor): TileDef => ({ col, row, color })

/** Named tiles used so far. Autotiled water/path sets get added with map generation (Phase 3). */
export const TILES = {
  pine: tile(28, 1, 'pine'),
  pines: tile(26, 1, 'pine'),
  bush: tile(28, 4, 'grass'),
  sprouts: tile(26, 4, 'grass'),
  tuft: tile(29, 4, 'grass'),
  tallGrass: tile(27, 16, 'swampGrass'),
  deadTree: tile(2, 8, 'deadTree'),
  rock: tile(4, 3, 'rock'),
  stones: tile(3, 1, 'rock'),
  mushrooms: tile(4, 5, 'shop'),
  pumpkin: tile(4, 9, 'pumpkin'),
  skull: tile(2, 2, 'bone'),
  tent: tile(22, 17, 'wood'),
  grave: tile(16, 5, 'shrine'),
  chest: tile(18, 3, 'shop'),
  sign: tile(20, 5, 'wood'),
  flag: tile(18, 23, 'enemy'),
  fence: tile(17, 29, 'wood'),
  waterFill: tile(4, 16, 'water'),
  pathFill: tile(4, 24, 'path'),
} as const satisfies Record<string, TileDef>

export type TileName = keyof typeof TILES
