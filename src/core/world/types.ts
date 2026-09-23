/** Overworld model. Rules: docs/research/mechanics.md §6 and §8. */
import type { Equipped } from '../items/loadout'

export type Biome = 'start' | 'glade' | 'plains' | 'forest'

export type Terrain =
  | 'ground'
  | 'path'
  | 'water'
  | 'bridge'
  | 'pine'
  | 'pines'
  | 'rock'
  | 'deadTree'
  | 'bush'
  | 'tuft'
  | 'sprouts'
  | 'tallGrass'
  | 'flowers'
  | 'stones'

export interface Point {
  readonly x: number
  readonly y: number
}

export interface WorldMap {
  readonly width: number
  readonly height: number
  /** Row-major, `y * width + x`. */
  readonly terrain: readonly Terrain[]
  readonly biome: readonly Biome[]
}

export type PoiKind = 'home' | 'chest' | 'weaponPile' | 'campfire'

export interface Poi extends Point {
  readonly id: string
  readonly kind: PoiKind
  /** One-shot locations (chests, piles) are marked used after interaction. */
  readonly used: boolean
  /** Items rolled the first time a chest/pile is opened, so closing and reopening can't reroll. */
  readonly offer?: readonly Equipped[]
}

export interface EnemyEntity extends Point {
  readonly id: string
  readonly enemyId: string
  readonly alive: boolean
}

export interface World {
  readonly map: WorldMap
  readonly start: Point
  readonly pois: readonly Poi[]
  readonly enemies: readonly EnemyEntity[]
}
