/**
 * Behaviour the research could not pin down (docs/research/mechanics.md §9).
 * Each flag has our default; flip one here to change the rule everywhere.
 */
export interface Rules {
  /** Freeze halves attack: round down or up. */
  readonly freezeRounding: 'floor' | 'ceil'
  /** "Every other turn" fires on own turns 1,3,5… ('odd', tested by the sim author) or 2,4,6… ('even', wiki text). */
  readonly everyOtherTurn: 'odd' | 'even'
  /** Round at which fatigue damage begins; it deals (round − start + 1) each turn, ignoring armor. */
  readonly fatigueStartRound: number
  /** Safety stop: the player loses if a battle reaches this round. */
  readonly maxRounds: number
  /** Riptide damage per trigger. */
  readonly riptideDamage: number
  /** Health restored per purity stack removed. */
  readonly purityHeal: number
  /** Max nested trigger depth before further triggers are ignored. */
  readonly maxTriggerDepth: number
}

export const DEFAULT_RULES: Rules = {
  freezeRounding: 'floor',
  everyOtherTurn: 'odd',
  fatigueStartRound: 40,
  maxRounds: 500,
  riptideDamage: 5,
  purityHeal: 3,
  maxTriggerDepth: 32,
}
