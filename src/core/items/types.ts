import type { BaseStats, Source } from '../combat/types'

export type Rarity = 'common' | 'rare' | 'heroic' | 'mythic'
export type Tier = 'normal' | 'golden' | 'diamond'
export type Tag = 'stone' | 'wood' | 'water' | 'jewelry' | 'sanguine' | 'ring' | 'bomb' | 'food' | 'unique'

export const TIER_MULTIPLIER: Record<Tier, number> = { normal: 1, golden: 2, diamond: 4 }

/** Behaviour of a source, minus identity fields that are filled in when it is equipped. */
export type SourceSpec = Omit<Source, 'id' | 'name' | 'kind' | 'text'>

/** Scales a number by the item's tier (Golden ×2, Diamond ×4). */
export type Scale = (n: number) => number

export interface ItemStats {
  readonly attack?: number
  readonly armor?: number
  readonly speed?: number
  readonly health?: number
}

export interface ItemDef {
  readonly id: string
  readonly name: string
  readonly kind: 'weapon' | 'item'
  readonly rarity: Rarity
  readonly tags: readonly Tag[]
  readonly stats: ItemStats
  /** Wiki effect text; `{n}` placeholders are scaled by tier. */
  readonly text: string
  readonly effect?: (x: Scale) => SourceSpec
}

export interface CreatureDef {
  readonly id: string
  readonly name: string
  readonly stats: BaseStats
  readonly text: string
  readonly trait?: SourceSpec
}

/** A regular enemy with three week-scaled levels. */
export interface EnemyDef {
  readonly id: string
  readonly name: string
  readonly levels: readonly [CreatureDef, CreatureDef, CreatureDef]
}

export interface BossDef extends CreatureDef {
  readonly week: 1 | 2 | 3
}
