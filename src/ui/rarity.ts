import type { Rarity } from '../core/items/types'
import { PALETTE } from '../render/palette'

export const RARITY_COLOR: Record<Rarity, string> = {
  common: PALETTE.frame,
  rare: PALETTE.armor,
  heroic: PALETTE.shop,
  mythic: PALETTE.night,
}
