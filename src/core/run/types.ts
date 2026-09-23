/** A single run: world, clock, hero and whatever screen is in front. Changed only by `runReducer`. */
import type { BattleResult } from '../combat/types'
import type { Equipped } from '../items/loadout'
import type { BossDef, EdgeDef, EnemyDef, ItemDef, OilKind, Recipe, SetDef } from '../items/types'
import type { Rng } from '../rng'
import type { Point, Ware, World } from '../world/types'

/** Game content the run draws from; injected so tests can use tiny pools. */
export interface Content {
  readonly items: readonly ItemDef[]
  readonly weapons: readonly ItemDef[]
  readonly enemies: Readonly<Record<string, EnemyDef>>
  readonly bosses: readonly BossDef[]
  readonly sets: readonly SetDef[]
  readonly edges: readonly EdgeDef[]
  readonly recipes: readonly Recipe[]
  readonly merges: readonly Recipe[]
  readonly startingWeapon: ItemDef
}

export interface Hero {
  readonly hp: number
  readonly gold: number
  readonly weapon: Equipped | null
  /** Length = unlocked slots; `null` = empty. Slot order = trigger order. */
  readonly items: readonly (Equipped | null)[]
  readonly baseHealth: number
  /** Blade oils applied to the current weapon. */
  readonly oils: readonly OilKind[]
  /** Forge edge on the current weapon. */
  readonly edge: EdgeDef | null
}

export type ShopSlot = Ware

/** Golem, cauldron or woodcutter: consume the items in `slots`; `result` lands in the first slot. */
export interface CraftOption {
  readonly result: Equipped
  readonly slots: readonly [number, number]
  /** The result stays a surprise until crafted (Woodcutter). */
  readonly hidden?: boolean
}

/** Crystal Ball (reveal a location), Waypoint (travel), Fairy (transform a slot), Wishing Well (buy a tiered item). */
export type PickPurpose = 'reveal' | 'travel' | 'fairy' | 'well'

export interface PickOption {
  /** A POI id (reveal/travel), a slot index (fairy) or a tier (well). */
  readonly id: string
  readonly label: string
}

export interface BattleInfo {
  readonly id: string
  readonly result: BattleResult
  readonly enemyName: string
  readonly enemyText: string
  readonly boss: boolean
  readonly goldReward: number
  readonly source: { readonly kind: 'enemy'; readonly entityId: string } | { readonly kind: 'boss'; readonly bossId: string }
  /** Boss battles open with a title card. */
  readonly intro?: { readonly title: string; readonly subtitle: string }
}

export type Screen =
  | { readonly kind: 'map' }
  | { readonly kind: 'battle'; readonly battle: BattleInfo }
  | {
      readonly kind: 'choice'
      readonly poiId: string
      readonly title: string
      readonly options: readonly Equipped[]
      readonly notice?: string
    }
  | { readonly kind: 'message'; readonly title: string; readonly text: string }
  | {
      readonly kind: 'shop'
      readonly poiId: string
      readonly title: string
      readonly stock: readonly Ware[]
      /** `null` where rerolling isn't offered (Bargaining Tent). */
      readonly rerollCost: number | null
      readonly canHaggle: boolean
      readonly notice?: string
    }
  | { readonly kind: 'forge'; readonly poiId: string; readonly options: readonly EdgeDef[]; readonly cost: number; readonly notice?: string }
  | { readonly kind: 'oil'; readonly poiId: string; readonly options: readonly OilKind[] }
  | { readonly kind: 'craft'; readonly poiId: string; readonly title: string; readonly options: readonly CraftOption[] }
  | {
      readonly kind: 'pick'
      readonly poiId: string
      readonly title: string
      readonly text: string
      readonly purpose: PickPurpose
      readonly options: readonly PickOption[]
      readonly notice?: string
    }
  | { readonly kind: 'gameOver' }
  | { readonly kind: 'victory' }

export type Week = 1 | 2 | 3

export interface RunState {
  readonly seed: number
  readonly rng: Rng
  readonly world: World
  readonly player: Point
  readonly week: Week
  /** Steps taken this week (see core/world/clock). */
  readonly step: number
  readonly revealed: ReadonlySet<string>
  readonly hero: Hero
  /** Boss id for each week (drawn from that week's pool at run start) so Tab can preview it. */
  readonly bosses: readonly [string, string, string]
  readonly screen: Screen
}

export type RunAction =
  | { readonly type: 'move'; readonly dx: number; readonly dy: number }
  | { readonly type: 'finishBattle' }
  | { readonly type: 'choose'; readonly index: number }
  | { readonly type: 'dismiss' }
  | { readonly type: 'discard'; readonly slot: number }
  | { readonly type: 'reorder'; readonly from: number; readonly to: number }
  | { readonly type: 'buy'; readonly index: number }
  | { readonly type: 'reroll' }
  | { readonly type: 'haggle' }
  | { readonly type: 'fightBoss' }
