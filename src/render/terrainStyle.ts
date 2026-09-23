import type { Terrain } from '../core/world/types'
import { PALETTE } from './palette'
import type { TileName } from './tiles'

/** Glyph + tint for each decorative terrain. Paths, water and bridges are drawn separately. */
export const TERRAIN_GLYPH: Partial<Record<Terrain, { readonly tile: TileName; readonly color: string }>> = {
  pine: { tile: 'pine', color: PALETTE.pine },
  pines: { tile: 'pines', color: PALETTE.forestPine },
  rock: { tile: 'rock', color: PALETTE.rock },
  stones: { tile: 'stones', color: PALETTE.rock },
  deadTree: { tile: 'deadTree', color: PALETTE.deadTree },
  bush: { tile: 'bush', color: PALETTE.grass },
  tuft: { tile: 'tuft', color: PALETTE.grass },
  sprouts: { tile: 'sprouts', color: PALETTE.grass },
  tallGrass: { tile: 'tallGrass', color: PALETTE.swampGrass },
  flowers: { tile: 'sprouts', color: PALETTE.flowers },
}
