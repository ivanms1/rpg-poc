/** A single run: world, clock, hero and whatever screen is in front. Changed only by `runReducer`. */
import type { BattleResult } from '../combat/types'
import type { Equipped } from '../items/loadout'
import type { BossDef, EnemyDef, ItemDef } from '../items/types'
import type { Rng } from '../rng'
import type { Point, World } from '../world/types'

/** Game content the run draws from; injected so tests can use tiny pools. */
export interface Content {
  readonly items: readonly ItemDef[]
  readonly weapons: readonly ItemDef[]
  readonly enemies: Readonly<Record<string, EnemyDef>>
  readonly bosses: readonly BossDef[]
  readonly startingWeapon: ItemDef
}

export interface Hero {
  readonly hp: number
  readonly gold: number
  readonly weapon: Equipped | null
  /** Length = unlocked slots; `null` = empty. Slot order = trigger order. */
  readonly items: readonly (Equipped | null)[]
  readonly baseHealth: number
}

export interface BattleInfo {
  readonly id: string
  readonly result: BattleResult
  readonly enemyName: string
  readonly enemyText: string
  readonly boss: boolean
  readonly goldReward: number
  readonly source: { readonly kind: 'enemy'; readonly entityId: string } | { readonly kind: 'boss' }
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
  /** Boss id for each week, fixed at run start so Tab can preview it. */
  readonly bosses: readonly [string, string, string]
  readonly screen: Screen
}

export type RunAction =
  | { readonly type: 'move'; readonly dx: number; readonly dy: number }
  | { readonly type: 'finishBattle' }
  | { readonly type: 'choose'; readonly index: number }
  | { readonly type: 'dismiss' }
  | { readonly type: 'discard'; readonly slot: number }
  | { readonly type: 'fightBoss' }
