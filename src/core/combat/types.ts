/** Combat model. Rules: docs/research/mechanics.md §1–5. */
import type { Rules } from '../rules'

export type Side = 'player' | 'enemy'

export const STATUS_NAMES = ['poison', 'acid', 'regen', 'riptide', 'freeze', 'stun', 'thorns', 'purity'] as const
export type StatusName = (typeof STATUS_NAMES)[number]
export type Statuses = Readonly<Record<StatusName, number>>

export type StatName = 'attack' | 'armor' | 'speed' | 'maxHp'

export interface BaseStats {
  readonly maxHp: number
  readonly attack: number
  readonly armor: number
  readonly speed: number
}

export type TriggerName =
  | 'battleStart'
  | 'turnStart'
  | 'turnEnd'
  | 'onHit'
  | 'exposed'
  | 'wounded'
  | 'onDamaged'
  | 'onHeal'
  | 'onGainThorns'
  | 'enemyWounded'
  /** This fighter dealt non-strike damage to its opponent. */
  | 'onDealDamage'
  /** This fighter was struck (after the strike, its On Hit effects and thorns). */
  | 'onStruck'
  | 'onLoseArmor'
  | 'onLoseHealth'
  | 'onGainSpeed'
  | 'onLoseSpeed'
  | 'onLoseThorns'
  /** Healing beyond max health. */
  | 'onOverheal'

export interface HookPayload {
  /** onHit: damage the strike dealt. onDamaged/onHeal/on*: the amount. onGainThorns: stacks gained. */
  readonly amount?: number
  /** onStruck: armor the strike removed. */
  readonly armorLost?: number
}

/** What caused a damage event; outgoing modifiers can key on it. */
export type DamageKind = 'strike' | 'thorns' | 'bomb' | 'item' | 'status'

export interface HookContext {
  readonly self: Side
  readonly source: SourceRef
  readonly payload: HookPayload
}

export type Hook = (state: BattleState, ctx: HookContext) => BattleState

/** Read-only query used by passive modifiers ("while…", "if…"). */
export type Modifier<T> = (state: BattleState, self: Side) => T

/** Anything that contributes behaviour to a fighter: creature trait, weapon, edge, item, set bonus. */
export interface Source {
  readonly id: string
  readonly name: string
  readonly kind: 'trait' | 'weapon' | 'edge' | 'item' | 'set'
  readonly text?: string
  readonly hooks?: Partial<Record<TriggerName, Hook>>
  /** Extra attack while a condition holds (Bear, Wolf, Ironstone Sandals…). */
  readonly attackBonus?: Modifier<number>
  /** Extra damage on this fighter's strike; `strikeIndex` counts strikes this battle, from 1. */
  readonly strikeBonus?: (state: BattleState, self: Side, strikeIndex: number) => number
  /** Adjust damage this fighter is about to take (Brittlebark Beast, Ironstone Armor…). */
  readonly incomingDamage?: (state: BattleState, self: Side, amount: number, isStrike: boolean) => number
  /** Adjust damage this fighter deals (Sword Talisman, Explosive Powder, Cactus Cap). */
  readonly outgoingDamage?: (state: BattleState, self: Side, amount: number, kind: DamageKind) => number
  /** Adjust healing this fighter receives (Sanguine Rose, Druid's Cloak). */
  readonly incomingHeal?: (state: BattleState, self: Side, amount: number) => number
  /** Adjust positive armor gains (Shield Talisman). */
  readonly armorGain?: (state: BattleState, self: Side, amount: number) => number
  /** Adjust additional strikes gained (Swiftstrike Bow). */
  readonly extraStrikeGain?: (state: BattleState, self: Side, count: number) => number
  /** Gold can't exceed this (Royal Scepter). */
  readonly goldCap?: number
  /** On Hit effects trigger twice (Chainlink Medallion). */
  readonly doubleOnHit?: boolean
  /** Freeze doubles attack instead of halving it (Cold Resistance). */
  readonly freezeDoubles?: boolean
  /** Thorns aren't spent on the enemy's first N strikes (Granite Thorns). */
  readonly keepThornsForStrikes?: number
  /** Damage from your own items hits the enemy instead (Bloodmoon Armor). */
  readonly redirectSelfDamage?: boolean
  readonly ignoreArmor?: boolean
  /** Base number of strikes per turn (Swiftstrike Stag: 3, Twin Blade: 2). Highest wins. */
  readonly strikesPerTurn?: number
  /** Whether this fighter may strike this turn (Mountain Troll, Blackbriar King). */
  readonly canStrike?: Modifier<boolean>
}

export interface SourceRef {
  readonly id: string
  readonly name: string
}

export interface FighterState {
  readonly side: Side
  readonly name: string
  readonly hp: number
  readonly maxHp: number
  readonly attack: number
  readonly armor: number
  readonly speed: number
  readonly gold: number
  readonly statuses: Statuses
  readonly base: BaseStats
  /** Strikes made this battle. */
  readonly strikes: number
  /** Own turns taken this battle. */
  readonly turns: number
  /** Additional strikes queued for this fighter's next strike phase. */
  readonly extraStrikes: number
  readonly exposedCharges: number
  readonly wounded: boolean
  /** Thorns fired during the current turn; they are removed at that turn's end. */
  readonly thornsFired: boolean
}

export interface FighterVisible {
  readonly hp: number
  readonly maxHp: number
  readonly attack: number
  readonly armor: number
  readonly speed: number
  readonly gold: number
  readonly statuses: Statuses
}

export type BattleEventBody =
  | { readonly type: 'battleStart' }
  | { readonly type: 'turnStart'; readonly side: Side; readonly turn: number }
  | { readonly type: 'trigger'; readonly side: Side; readonly trigger: TriggerName; readonly source: string }
  | { readonly type: 'strike'; readonly side: Side; readonly damage: number }
  | { readonly type: 'stunned'; readonly side: Side }
  | { readonly type: 'damage'; readonly side: Side; readonly amount: number; readonly armorLost: number; readonly hpLost: number; readonly source: string }
  | { readonly type: 'heal'; readonly side: Side; readonly amount: number; readonly source: string }
  | { readonly type: 'stat'; readonly side: Side; readonly stat: StatName; readonly delta: number; readonly source: string }
  | { readonly type: 'status'; readonly side: Side; readonly status: StatusName; readonly delta: number; readonly source: string }
  | { readonly type: 'gold'; readonly side: Side; readonly delta: number; readonly source: string }
  | { readonly type: 'exposed'; readonly side: Side }
  | { readonly type: 'wounded'; readonly side: Side }
  | { readonly type: 'death'; readonly side: Side }
  | { readonly type: 'battleEnd'; readonly winner: Side; readonly turns: number }

/** Every event carries a snapshot of both fighters after it, so the UI can replay without re-simulating. */
export type BattleEvent = BattleEventBody & { readonly snapshot: Readonly<Record<Side, FighterVisible>> }

export interface BattleState {
  readonly rules: Rules
  readonly fighters: Readonly<Record<Side, FighterState>>
  readonly sources: Readonly<Record<Side, readonly Source[]>>
  /** Per-source memory (countdowns, "after 3 strikes"…), keyed by `${side}:${sourceId}:${name}`. */
  readonly counters: Readonly<Record<string, number>>
  readonly round: number
  readonly actor: Side
  readonly events: readonly BattleEvent[]
  readonly winner: Side | null
  /** Trigger nesting depth; guards against infinite "whenever" loops. */
  readonly depth: number
}

export interface Combatant {
  readonly name: string
  readonly stats: BaseStats
  /** Current health carried into the fight (player); defaults to maxHp. */
  readonly hp?: number
  readonly gold?: number
  readonly sources: readonly Source[]
}

export interface BattleResult {
  readonly winner: Side
  readonly events: readonly BattleEvent[]
  readonly rounds: number
  readonly final: Readonly<Record<Side, FighterState>>
}
