import type { BaseStats, Source } from '../combat/types'

export type Rarity = 'common' | 'rare' | 'heroic' | 'mythic'
export type Tier = 'normal' | 'golden' | 'diamond'
export type Tag = 'stone' | 'wood' | 'water' | 'jewelry' | 'sanguine' | 'ring' | 'bomb' | 'food' | 'rose' | 'unique'

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

/** What an item can know about the rest of the loadout when its effect is built. */
export interface LoadoutContext {
  readonly tagCount: (tag: Tag) => number
  readonly emptySlots: number
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
  readonly effect?: (x: Scale, ctx: LoadoutContext) => SourceSpec
  /** Rewrites base stats after everything else is summed (Granite Lance, Citrine Gemstone, Oak Heart…). */
  readonly baseModifier?: (stats: BaseStats, ctx: LoadoutContext, x: Scale) => BaseStats
  /** Gold gained at the start of every day (Loose Change). */
  readonly goldPerDay?: number
}

/** Blade Oil: +1 to one weapon stat, each at most once per weapon. */
export type OilKind = 'attack' | 'armor' | 'speed'

/** Forge edge: one per weapon, lost when the weapon is replaced. */
export interface EdgeDef {
  readonly id: string
  readonly name: string
  readonly text: string
  readonly effect: () => SourceSpec
}

/** Bonus that switches on while every part (item, weapon or edge id) is equipped. */
export interface SetDef {
  readonly id: string
  readonly name: string
  readonly parts: readonly string[]
  readonly text: string
  readonly stats?: ItemStats
  readonly effect?: () => SourceSpec
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
  /** A second form fought right after this one dies (Leshen → Woodland Abomination); the hero is fully healed between. */
  readonly next?: string
  /** Only reachable as another boss's `next`, never drawn for a week. */
  readonly hidden?: boolean
}
