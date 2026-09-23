import { dealDamage, removeStatus } from './ops'
import { emit, isOver, opponent, updateFighter } from './state'
import { runTrigger } from './triggers'
import type { BattleState, Side } from './types'

const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0)

/** Attack used for a strike: stat + "while" bonuses, halved by freeze (doubled with Cold Resistance). */
export const effectiveAttack = (state: BattleState, side: Side): number => {
  const f = state.fighters[side]
  const attack = f.attack + sum(state.sources[side].map((src) => src.attackBonus?.(state, side) ?? 0))
  if (f.statuses.freeze <= 0) return attack
  if (state.sources[side].some((src) => src.freezeDoubles)) return attack * 2
  return state.rules.freezeRounding === 'floor' ? Math.floor(attack / 2) : Math.ceil(attack / 2)
}

const lastDamageTo = (state: BattleState, side: Side, since: number): { amount: number; armorLost: number } => {
  const hit = state.events.slice(since).find((e) => e.type === 'damage' && e.side === side)
  return hit?.type === 'damage' ? { amount: hit.amount, armorLost: hit.armorLost } : { amount: 0, armorLost: 0 }
}

/** Thorns fired on a strike are spent at turn end, unless the defender keeps them for this strike. */
const spendsThorns = (state: BattleState, defender: Side, attackerStrikes: number): boolean =>
  !state.sources[defender].some((src) => src.keepThornsForStrikes !== undefined && attackerStrikes <= src.keepThornsForStrikes)

/** One strike: damage → attacker's On Hit (twice with Chainlink) → defender's thorns → defender's onStruck. */
export const performStrike = (state: BattleState, side: Side): BattleState => {
  const target = opponent(side)
  const strikeIndex = state.fighters[side].strikes + 1
  let s = updateFighter(state, side, { strikes: strikeIndex })

  const bonus = sum(s.sources[side].map((src) => src.strikeBonus?.(s, side, strikeIndex) ?? 0))
  const damage = Math.max(0, effectiveAttack(s, side)) + bonus
  const ignoreArmor = s.sources[side].some((src) => src.ignoreArmor)

  s = emit(s, { type: 'strike', side, damage })
  const before = s.events.length
  s = dealDamage(s, target, damage, 'strike', { isStrike: true, ignoreArmor, by: side, kind: 'strike' })
  const hit = lastDamageTo(s, target, before)
  const onHitRuns = 1 + s.sources[side].filter((src) => src.doubleOnHit).length
  for (let i = 0; i < onHitRuns; i++) s = runTrigger(s, side, 'onHit', { amount: hit.amount })

  const thorns = s.fighters[target].statuses.thorns
  if (!isOver(s) && thorns > 0) {
    if (spendsThorns(s, target, strikeIndex)) s = updateFighter(s, target, { thornsFired: true })
    s = dealDamage(s, side, thorns, `${s.fighters[target].name} thorns`, { by: target, kind: 'thorns' })
  }
  return runTrigger(s, target, 'onStruck', hit)
}

const strikesThisTurn = (state: BattleState, side: Side): number => {
  const sources = state.sources[side]
  const allowed = sources.every((src) => src.canStrike?.(state, side) ?? true)
  const base = Math.max(1, ...sources.map((src) => src.strikesPerTurn ?? 1))
  return (allowed ? base : 0) + state.fighters[side].extraStrikes
}

/** Base strikes plus queued additional strikes. Each strike attempt while stunned consumes one stun instead. */
export const strikePhase = (state: BattleState, side: Side): BattleState => {
  const count = strikesThisTurn(state, side)
  let s = updateFighter(state, side, { extraStrikes: 0 })
  for (let i = 0; i < count && !isOver(s); i++) {
    if (s.fighters[side].statuses.stun > 0) {
      s = removeStatus(emit(s, { type: 'stunned', side }), side, 'stun', 1, 'stun')
    } else {
      s = performStrike(s, side)
    }
  }
  return s
}
