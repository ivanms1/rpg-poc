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
import { opponent, updateFighter } from '../combat/state'
import type { BattleState, FighterState, Hook, HookContext, Side, StatName, StatusName } from '../combat/types'

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

/** "Take N damage": self damage that armor absorbs. */
export const takeDamage =
  (amount: Amount): Hook =>
  (state, ctx) =>
    dealDamage(state, ctx.self, value(amount, state, ctx.self, ctx), ctx.source.name)

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
    dealDamage(state, opponent(ctx.self), value(amount, state, ctx.self, ctx), ctx.source.name)

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
