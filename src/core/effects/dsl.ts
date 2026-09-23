/**
 * Small vocabulary for item/creature effects, so content reads close to its wiki text:
 *   hooks: { battleStart: when(fasterThanEnemy, gain('attack', 2)) }
 */
import {
  addExtraStrikes,
  addStatus,
  dealDamage,
  gainGold,
  gainStat,
  heal,
  loseArmor,
  loseHealth,
  stealGold,
} from '../combat/ops'
import { counterKey, getCounter, opponent, setCounter, updateFighter } from '../combat/state'
import { runTrigger } from '../combat/triggers'
import type { BattleState, FighterState, Hook, HookContext, Side, StatName, StatusName, TriggerName } from '../combat/types'

export type Cond = (state: BattleState, self: Side, ctx?: HookContext) => boolean
export type Amount = number | ((state: BattleState, self: Side, ctx?: HookContext) => number)

const value = (amount: Amount, state: BattleState, self: Side, ctx?: HookContext): number =>
  typeof amount === 'number' ? amount : amount(state, self, ctx)

const me = (state: BattleState, self: Side): FighterState => state.fighters[self]
const them = (state: BattleState, self: Side): FighterState => state.fighters[opponent(self)]

// ---------- Combinators ----------
export const seq =
  (...hooks: Hook[]): Hook =>
  (state, ctx) =>
    hooks.reduce((s, hook) => hook(s, ctx), state)

export const when =
  (cond: Cond, hook: Hook): Hook =>
  (state, ctx) =>
    cond(state, ctx.self, ctx) ? hook(state, ctx) : state

/** Runs `hook` `times` times. */
export const repeat =
  (times: number, hook: Hook): Hook =>
  (state, ctx) =>
    Array.from({ length: times }).reduce<BattleState>((s) => hook(s, ctx), state)

// ---------- Effects on self ----------
export const gain =
  (stat: StatName, amount: Amount): Hook =>
  (state, ctx) =>
    gainStat(state, ctx.self, stat, value(amount, state, ctx.self, ctx), ctx.source.name)

export const gainStatus =
  (status: StatusName, amount: Amount): Hook =>
  (state, ctx) =>
    addStatus(state, ctx.self, status, value(amount, state, ctx.self, ctx), ctx.source.name)

export const restore =
  (amount: Amount): Hook =>
  (state, ctx) =>
    heal(state, ctx.self, value(amount, state, ctx.self, ctx), ctx.source.name)

/** "Take N damage": self damage that armor absorbs (Bloodmoon Armor sends it to the enemy instead). */
export const takeDamage =
  (amount: Amount): Hook =>
  (state, ctx) => {
    const n = value(amount, state, ctx.self, ctx)
    const redirect = state.sources[ctx.self].some((src) => src.redirectSelfDamage)
    return dealDamage(state, redirect ? opponent(ctx.self) : ctx.self, n, ctx.source.name, { by: ctx.self, kind: 'item' })
  }

export const loseHp =
  (amount: Amount): Hook =>
  (state, ctx) =>
    loseHealth(state, ctx.self, value(amount, state, ctx.self, ctx), ctx.source.name)

export const earnGold =
  (amount: Amount): Hook =>
  (state, ctx) =>
    gainGold(state, ctx.self, value(amount, state, ctx.self, ctx), ctx.source.name)

export const additionalStrikes =
  (count: Amount): Hook =>
  (state, ctx) =>
    addExtraStrikes(state, ctx.self, value(count, state, ctx.self, ctx))

/** "Exposed can trigger N additional times". */
export const extraExposed =
  (count: number): Hook =>
  (state, ctx) =>
    updateFighter(state, ctx.self, (f) => ({ exposedCharges: f.exposedCharges + count }))

// ---------- Effects on the enemy ----------
export const damageEnemy =
  (amount: Amount): Hook =>
  (state, ctx) =>
    dealDamage(state, opponent(ctx.self), value(amount, state, ctx.self, ctx), ctx.source.name, { by: ctx.self, kind: 'item' })

/** Damage from a bomb item (Explosive Powder and friends key on it). */
export const bombDamage =
  (amount: Amount): Hook =>
  (state, ctx) =>
    dealDamage(state, opponent(ctx.self), value(amount, state, ctx.self, ctx), ctx.source.name, { by: ctx.self, kind: 'bomb' })

export const enemyAdditionalStrikes =
  (count: Amount): Hook =>
  (state, ctx) =>
    addExtraStrikes(state, opponent(ctx.self), value(count, state, ctx.self, ctx))

export const giveEnemy =
  (status: StatusName, amount: Amount): Hook =>
  (state, ctx) =>
    addStatus(state, opponent(ctx.self), status, value(amount, state, ctx.self, ctx), ctx.source.name)

export const enemyGains =
  (stat: StatName, amount: Amount): Hook =>
  (state, ctx) =>
    gainStat(state, opponent(ctx.self), stat, value(amount, state, ctx.self, ctx), ctx.source.name)

export const stealArmor =
  (amount: Amount): Hook =>
  (state, ctx) => {
    const taken = Math.min(value(amount, state, ctx.self, ctx), them(state, ctx.self).armor)
    if (taken <= 0) return state
    return gainStat(loseArmor(state, opponent(ctx.self), taken, ctx.source.name), ctx.self, 'armor', taken, ctx.source.name)
  }

export const stealEnemyGold =
  (amount: Amount): Hook =>
  (state, ctx) =>
    stealGold(state, ctx.self, value(amount, state, ctx.self, ctx), ctx.source.name)

/** Fires this fighter's own `trigger` items (Blood Chain → Wounded). */
export const triggerOwn =
  (trigger: TriggerName): Hook =>
  (state, ctx) =>
    runTrigger(state, ctx.self, trigger)

// ---------- Memory ----------
const memoKey = (ctx: HookContext, name: string) => counterKey(ctx.self, ctx.source.id, name)

/** Runs `hook` only the first time this source fires this battle. */
export const once =
  (hook: Hook): Hook =>
  (state, ctx) => {
    const key = memoKey(ctx, 'once')
    if (getCounter(state, key) > 0) return state
    return hook(setCounter(state, key, 1), ctx)
  }

/** Sets a per-battle flag for this source (read with `flagged`). */
export const flag =
  (name: string): Hook =>
  (state, ctx) =>
    setCounter(state, memoKey(ctx, name), 1)

/** Runs `hook` only if this source set `flag(name)` earlier in the battle. */
export const ifFlag =
  (name: string, hook: Hook): Hook =>
  (state, ctx) =>
    getCounter(state, memoKey(ctx, name)) > 0 ? hook(state, ctx) : state

/** Counts calls within the current turn and runs `hook` on the `n`th. */
export const nthThisTurn =
  (n: number, hook: Hook): Hook =>
  (state, ctx) => {
    const key = memoKey(ctx, `turn:${state.round}:${state.actor}`)
    const count = getCounter(state, key) + 1
    const counted = setCounter(state, key, count)
    return count === n ? hook(counted, ctx) : counted
  }

/** Adds `amount` to a per-battle tally for this source and returns the new state (read with `tally`). */
export const addTally =
  (name: string, amount: Amount): Hook =>
  (state, ctx) => {
    const key = memoKey(ctx, name)
    return setCounter(state, key, getCounter(state, key) + value(amount, state, ctx.self, ctx))
  }

export const tally =
  (name: string, fallback = 0): Amount =>
  (state, _self, ctx) =>
    ctx ? getCounter(state, memoKey(ctx, name), fallback) : fallback

// ---------- Conditions ----------
export const not =
  (cond: Cond): Cond =>
  (state, self, ctx) =>
    !cond(state, self, ctx)

export const fasterThanEnemy: Cond = (s, self) => me(s, self).speed > them(s, self).speed
export const slowerThanEnemy: Cond = (s, self) => me(s, self).speed < them(s, self).speed
export const hasArmor: Cond = (s, self) => me(s, self).armor > 0
export const enemyHasArmor: Cond = (s, self) => them(s, self).armor > 0
export const healthFull: Cond = (s, self) => me(s, self).hp >= me(s, self).maxHp
export const belowHalfHealth: Cond = (s, self) => me(s, self).hp * 2 < me(s, self).maxHp
export const enemyBelowHalfHealth: Cond = (s, self) => them(s, self).hp * 2 < them(s, self).maxHp
export const enemyHealthAtMost =
  (hp: number): Cond =>
  (s, self) =>
    them(s, self).hp <= hp
export const hasSpeed =
  (min: number): Cond =>
  (s, self) =>
    me(s, self).speed >= min
export const hasStatus =
  (status: StatusName): Cond =>
  (s, self) =>
    me(s, self).statuses[status] > 0
export const zeroBaseArmor: Cond = (s, self) => me(s, self).base.armor === 0
export const hasGold =
  (min: number): Cond =>
  (s, self) =>
    me(s, self).gold >= min
export const hasArmorAtLeast =
  (min: number): Cond =>
  (s, self) =>
    me(s, self).armor >= min
export const payloadAtLeast =
  (min: number): Cond =>
  (_s, _self, ctx) =>
    (ctx?.payload.amount ?? 0) >= min

/** True during this fighter's first own turn. */
export const firstTurn: Cond = (s, self) => me(s, self).turns === 1
/** "Every other turn" on own turns; parity from rules.everyOtherTurn. */
export const everyOtherTurn: Cond = (s, self) => {
  const turns = me(s, self).turns
  return s.rules.everyOtherTurn === 'odd' ? turns % 2 === 1 : turns % 2 === 0
}
/** Strike count equals n (use inside onHit). */
export const onStrike =
  (n: number): Cond =>
  (s, self) =>
    me(s, self).strikes === n
export const everyNthStrike =
  (n: number): Cond =>
  (s, self) =>
    me(s, self).strikes % n === 0

// ---------- Values ----------
export const myStat =
  (stat: 'attack' | 'armor' | 'speed' | 'hp' | 'maxHp'): Amount =>
  (s, self) =>
    me(s, self)[stat]
export const enemyStat =
  (stat: 'attack' | 'armor' | 'speed' | 'hp' | 'maxHp'): Amount =>
  (s, self) =>
    them(s, self)[stat]
export const myBase =
  (stat: 'attack' | 'armor' | 'speed' | 'maxHp'): Amount =>
  (s, self) =>
    me(s, self).base[stat]
export const missingHealth: Amount = (s, self) => me(s, self).maxHp - me(s, self).hp
export const payloadAmount: Amount = (_s, _self, ctx) => ctx?.payload.amount ?? 0
export const plus =
  (a: Amount, b: Amount): Amount =>
  (s, self, ctx) =>
    value(a, s, self, ctx) + value(b, s, self, ctx)
export const times =
  (a: Amount, factor: number): Amount =>
  (s, self, ctx) =>
    value(a, s, self, ctx) * factor

/** Passive attack bonus that applies while `cond` holds. */
export const whileBonus =
  (cond: Cond, amount: Amount) =>
  (state: BattleState, self: Side): number =>
    cond(state, self) ? value(amount, state, self) : 0

/** "Attack is always equal to X": bonus that replaces the attack stat. */
export const attackEquals =
  (amount: Amount) =>
  (state: BattleState, self: Side): number =>
    value(amount, state, self) - me(state, self).attack
