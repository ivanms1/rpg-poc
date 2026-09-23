/**
 * Primitive combat operations. Each returns a new BattleState, logs events, and fires the
 * reactive triggers (Exposed, Wounded, onDamaged, onHeal, onGainThorns). All are no-ops once
 * the battle has a winner.
 */
import { emit, isOver, opponent, updateFighter } from './state'
import { runTrigger } from './triggers'
import type { BattleState, Side, StatName, StatusName } from './types'

export interface DamageOptions {
  readonly isStrike?: boolean
  readonly ignoreArmor?: boolean
}

const checkDeath = (state: BattleState, side: Side): BattleState => {
  if (isOver(state) || state.fighters[side].hp > 0) return state
  return { ...emit(state, { type: 'death', side }), winner: opponent(side) }
}

const checkWounded = (state: BattleState, side: Side): BattleState => {
  const f = state.fighters[side]
  if (isOver(state) || f.wounded || f.hp * 2 > f.maxHp) return state
  let s = emit(updateFighter(state, side, { wounded: true }), { type: 'wounded', side })
  s = runTrigger(s, side, 'wounded')
  return runTrigger(s, opponent(side), 'enemyWounded')
}

/** Call after armor dropped: fires Exposed if it just reached 0 and a charge remains. */
const checkExposed = (state: BattleState, side: Side): BattleState => {
  const f = state.fighters[side]
  if (isOver(state) || f.armor > 0 || f.exposedCharges <= 0) return state
  const s = emit(updateFighter(state, side, { exposedCharges: f.exposedCharges - 1 }), { type: 'exposed', side })
  return runTrigger(s, side, 'exposed')
}

const afterHealthLoss = (state: BattleState, side: Side): BattleState => checkWounded(checkDeath(state, side), side)

const adjustIncoming = (state: BattleState, side: Side, amount: number, isStrike: boolean): number =>
  state.sources[side].reduce((dmg, src) => (src.incomingDamage ? src.incomingDamage(state, side, dmg, isStrike) : dmg), amount)

export const dealDamage = (state: BattleState, side: Side, raw: number, source: string, opts: DamageOptions = {}): BattleState => {
  if (isOver(state) || raw <= 0) return state
  const amount = Math.max(0, adjustIncoming(state, side, raw, opts.isStrike ?? false))
  if (amount <= 0) return state

  const f = state.fighters[side]
  const armorLost = opts.ignoreArmor ? 0 : Math.min(f.armor, amount)
  const hpLost = amount - armorLost
  let s = updateFighter(state, side, { armor: f.armor - armorLost, hp: f.hp - hpLost })
  s = emit(s, { type: 'damage', side, amount, armorLost, hpLost, source })
  // Death is settled before any reactive effect, so a fighter killed by this hit can't strike back via Exposed etc.
  s = checkDeath(s, side)
  if (armorLost > 0) s = checkExposed(s, side)
  if (hpLost > 0) s = checkWounded(s, side)
  return runTrigger(s, side, 'onDamaged', { amount })
}

/** Health loss that bypasses armor and is not "taking damage" (self-costs, fatigue). */
export const loseHealth = (state: BattleState, side: Side, amount: number, source: string): BattleState => {
  if (isOver(state) || amount <= 0) return state
  const s = updateFighter(state, side, (f) => ({ hp: f.hp - amount }))
  return afterHealthLoss(emit(s, { type: 'damage', side, amount, armorLost: 0, hpLost: amount, source }), side)
}

export const heal = (state: BattleState, side: Side, amount: number, source: string): BattleState => {
  const f = state.fighters[side]
  const restored = Math.min(amount, f.maxHp - f.hp)
  if (isOver(state) || restored <= 0) return state
  const s = emit(updateFighter(state, side, { hp: f.hp + restored }), { type: 'heal', side, amount: restored, source })
  return runTrigger(s, side, 'onHeal', { amount: restored })
}

/** Armor removal that is not damage (acid, conversions, "lose armor"). Can trigger Exposed. */
export const loseArmor = (state: BattleState, side: Side, amount: number, source: string): BattleState => {
  const lost = Math.min(amount, state.fighters[side].armor)
  if (isOver(state) || lost <= 0) return state
  const s = emit(updateFighter(state, side, (f) => ({ armor: f.armor - lost })), { type: 'stat', side, stat: 'armor', delta: -lost, source })
  return checkExposed(s, side)
}

export const gainStat = (state: BattleState, side: Side, stat: StatName, delta: number, source: string): BattleState => {
  if (isOver(state) || delta === 0) return state
  if (stat === 'armor' && delta < 0) return loseArmor(state, side, -delta, source)
  if (stat === 'maxHp') {
    const f = state.fighters[side]
    const maxHp = Math.max(1, f.maxHp + delta)
    const hp = delta > 0 ? f.hp + delta : Math.min(f.hp, maxHp)
    return emit(updateFighter(state, side, { maxHp, hp }), { type: 'stat', side, stat, delta: maxHp - f.maxHp, source })
  }
  const s = updateFighter(state, side, (f) => ({ [stat]: f[stat] + delta }))
  return emit(s, { type: 'stat', side, stat, delta, source })
}

export const addStatus = (state: BattleState, side: Side, status: StatusName, stacks: number, source: string): BattleState => {
  if (stacks < 0) return removeStatus(state, side, status, -stacks, source)
  if (isOver(state) || stacks === 0) return state
  const f = state.fighters[side]
  let s = updateFighter(state, side, { statuses: { ...f.statuses, [status]: f.statuses[status] + stacks } })
  s = emit(s, { type: 'status', side, status, delta: stacks, source })
  return status === 'thorns' ? runTrigger(s, side, 'onGainThorns', { amount: stacks }) : s
}

export const removeStatus = (state: BattleState, side: Side, status: StatusName, stacks: number, source: string): BattleState => {
  const f = state.fighters[side]
  const removed = Math.min(stacks, f.statuses[status])
  if (isOver(state) || removed <= 0) return state
  let s = updateFighter(state, side, { statuses: { ...f.statuses, [status]: f.statuses[status] - removed } })
  s = emit(s, { type: 'status', side, status, delta: -removed, source })
  if (status !== 'purity') return s
  s = gainStat(s, side, 'attack', removed, 'purity')
  return heal(s, side, removed * s.rules.purityHeal, 'purity')
}

export const gainGold = (state: BattleState, side: Side, delta: number, source: string): BattleState => {
  const f = state.fighters[side]
  const applied = Math.max(-f.gold, delta)
  if (isOver(state) || applied === 0) return state
  return emit(updateFighter(state, side, { gold: f.gold + applied }), { type: 'gold', side, delta: applied, source })
}

/** `thief` takes up to `amount` gold from its opponent. */
export const stealGold = (state: BattleState, thief: Side, amount: number, source: string): BattleState => {
  const taken = Math.min(amount, state.fighters[opponent(thief)].gold)
  if (taken <= 0) return state
  return gainGold(gainGold(state, opponent(thief), -taken, source), thief, taken, source)
}

export const addExtraStrikes = (state: BattleState, side: Side, count: number): BattleState =>
  isOver(state) || count <= 0 ? state : updateFighter(state, side, (f) => ({ extraStrikes: f.extraStrikes + count }))
