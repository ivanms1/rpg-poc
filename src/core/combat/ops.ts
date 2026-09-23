/**
 * Primitive combat operations. Each returns a new BattleState, logs events, and fires the
 * reactive triggers (Exposed, Wounded, onDamaged, onLose*, onGain*, onHeal…). All are no-ops
 * once the battle has a winner.
 */
import { emit, isOver, opponent, updateFighter } from './state'
import { runTrigger } from './triggers'
import type { BattleState, DamageKind, Side, Source, StatName, StatusName } from './types'

export interface DamageOptions {
  readonly isStrike?: boolean
  readonly ignoreArmor?: boolean
  /** Who dealt it, for outgoing modifiers and onDealDamage. */
  readonly by?: Side
  readonly kind?: DamageKind
}

/** Folds `pick` over a fighter's sources that define it. */
const modify = <K extends keyof Source>(
  state: BattleState,
  side: Side,
  key: K,
  start: number,
  apply: (fn: NonNullable<Source[K]>, value: number) => number,
): number => state.sources[side].reduce((value, src) => (src[key] ? apply(src[key] as NonNullable<Source[K]>, value) : value), start)

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

const afterHealthLoss = (state: BattleState, side: Side, lost: number): BattleState =>
  runTrigger(checkWounded(checkDeath(state, side), side), side, 'onLoseHealth', { amount: lost })

export const dealDamage = (state: BattleState, side: Side, raw: number, source: string, opts: DamageOptions = {}): BattleState => {
  if (isOver(state) || raw <= 0) return state
  const kind = opts.kind ?? (opts.isStrike ? 'strike' : 'item')
  const dealt = opts.by ? modify(state, opts.by, 'outgoingDamage', raw, (fn, v) => fn(state, opts.by as Side, v, kind)) : raw
  const amount = Math.max(0, modify(state, side, 'incomingDamage', dealt, (fn, v) => fn(state, side, v, opts.isStrike ?? false)))
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
  s = runTrigger(s, side, 'onDamaged', { amount })
  if (armorLost > 0) s = runTrigger(s, side, 'onLoseArmor', { amount: armorLost })
  if (hpLost > 0) s = runTrigger(s, side, 'onLoseHealth', { amount: hpLost })
  if (opts.by && opts.by !== side && kind !== 'strike') s = runTrigger(s, opts.by, 'onDealDamage', { amount })
  return s
}

/** Health loss that bypasses armor and is not "taking damage" (self-costs, fatigue). */
export const loseHealth = (state: BattleState, side: Side, amount: number, source: string): BattleState => {
  if (isOver(state) || amount <= 0) return state
  const s = updateFighter(state, side, (f) => ({ hp: f.hp - amount }))
  return afterHealthLoss(emit(s, { type: 'damage', side, amount, armorLost: 0, hpLost: amount, source }), side, amount)
}

export const heal = (state: BattleState, side: Side, raw: number, source: string): BattleState => {
  if (isOver(state) || raw <= 0) return state
  const amount = Math.max(0, modify(state, side, 'incomingHeal', raw, (fn, v) => fn(state, side, v)))
  const f = state.fighters[side]
  const restored = Math.min(amount, f.maxHp - f.hp)
  const overheal = amount - restored
  let s = state
  if (restored > 0) {
    s = emit(updateFighter(s, side, { hp: f.hp + restored }), { type: 'heal', side, amount: restored, source })
    s = runTrigger(s, side, 'onHeal', { amount: restored })
  }
  return overheal > 0 ? runTrigger(s, side, 'onOverheal', { amount: overheal }) : s
}

/** Armor removal that is not damage (acid, conversions, "lose armor"). Can trigger Exposed. */
export const loseArmor = (state: BattleState, side: Side, amount: number, source: string): BattleState => {
  const lost = Math.min(amount, state.fighters[side].armor)
  if (isOver(state) || lost <= 0) return state
  const s = emit(updateFighter(state, side, (f) => ({ armor: f.armor - lost })), { type: 'stat', side, stat: 'armor', delta: -lost, source })
  return runTrigger(checkExposed(s, side), side, 'onLoseArmor', { amount: lost })
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
  const applied = stat === 'armor' ? modify(state, side, 'armorGain', delta, (fn, v) => fn(state, side, v)) : delta
  let s = updateFighter(state, side, (f) => ({ [stat]: f[stat] + applied }))
  s = emit(s, { type: 'stat', side, stat, delta: applied, source })
  if (stat !== 'speed') return s
  return runTrigger(s, side, applied > 0 ? 'onGainSpeed' : 'onLoseSpeed', { amount: Math.abs(applied) })
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
  if (status === 'thorns') return runTrigger(s, side, 'onLoseThorns', { amount: removed })
  if (status !== 'purity') return s
  s = gainStat(s, side, 'attack', removed, 'purity')
  return heal(s, side, removed * s.rules.purityHeal, 'purity')
}

export const gainGold = (state: BattleState, side: Side, delta: number, source: string): BattleState => {
  const f = state.fighters[side]
  const cap = Math.min(Infinity, ...state.sources[side].map((src) => src.goldCap ?? Infinity))
  const target = Math.max(0, Math.min(f.gold + delta, delta > 0 ? Math.max(cap, f.gold) : Infinity))
  const applied = target - f.gold
  if (isOver(state) || applied === 0) return state
  return emit(updateFighter(state, side, { gold: target }), { type: 'gold', side, delta: applied, source })
}

/** `thief` takes up to `amount` gold from its opponent. */
export const stealGold = (state: BattleState, thief: Side, amount: number, source: string): BattleState => {
  const taken = Math.min(amount, state.fighters[opponent(thief)].gold)
  if (taken <= 0) return state
  return gainGold(gainGold(state, opponent(thief), -taken, source), thief, taken, source)
}

export const addExtraStrikes = (state: BattleState, side: Side, count: number): BattleState => {
  if (isOver(state) || count <= 0) return state
  const gained = modify(state, side, 'extraStrikeGain', count, (fn, v) => fn(state, side, v))
  return updateFighter(state, side, (f) => ({ extraStrikes: f.extraStrikes + gained }))
}
