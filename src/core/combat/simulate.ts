/** Battle loop. Rules: docs/research/mechanics.md §2. */
import { DEFAULT_RULES, type Rules } from '../rules'
import { loseHealth } from './ops'
import { createBattle, emit, isOver, opponent, updateFighter } from './state'
import { turnEndTicks, turnStartTicks } from './statuses'
import { strikePhase } from './strike'
import { runTrigger } from './triggers'
import type { BattleResult, BattleState, Combatant, Side } from './types'

const roundOf = (state: BattleState): number =>
  Math.floor((state.fighters.player.turns + state.fighters.enemy.turns) / 2) + 1

const fatigue = (state: BattleState, side: Side): BattleState => {
  const amount = state.round - state.rules.fatigueStartRound + 1
  return amount > 0 ? loseHealth(state, side, amount, 'fatigue') : state
}

const takeTurn = (state: BattleState, side: Side): BattleState => {
  let s: BattleState = { ...state, actor: side, round: roundOf(state) }
  s = updateFighter(s, side, (f) => ({ turns: f.turns + 1 }))
  s = emit(s, { type: 'turnStart', side, turn: s.round })
  s = fatigue(s, side)
  s = runTrigger(s, side, 'turnStart')
  s = turnStartTicks(s, side)
  if (!isOver(s)) s = strikePhase(s, side)
  s = runTrigger(s, side, 'turnEnd')
  return isOver(s) ? s : turnEndTicks(s, side)
}

export const simulateBattle = (player: Combatant, enemy: Combatant, rules: Partial<Rules> = {}): BattleResult => {
  let s = createBattle(player, enemy, { ...DEFAULT_RULES, ...rules })
  s = emit(s, { type: 'battleStart' })
  s = runTrigger(s, 'player', 'battleStart')
  s = runTrigger(s, 'enemy', 'battleStart')

  let side: Side = s.fighters.player.speed >= s.fighters.enemy.speed ? 'player' : 'enemy'
  while (!isOver(s) && roundOf(s) <= s.rules.maxRounds) {
    s = takeTurn(s, side)
    side = opponent(side)
  }
  if (!isOver(s)) s = { ...s, winner: 'enemy' }

  const winner = s.winner ?? 'enemy'
  s = emit(s, { type: 'battleEnd', winner, turns: s.round })
  return { winner, events: s.events, rounds: s.round, final: s.fighters }
}
