/**
 * Difficulty modes, after the real game's Patch #08 (docs/research/mechanics.md §10). The patch notes
 * give the shape, not the numbers; steps, luck and boss strength here are our own tuning.
 */
import type { BossDef } from '../items/types'
import { NORMAL_SCHEDULE, timeOfWeek, type Schedule, type TimeOfWeek } from '../world/clock'

export const DIFFICULTY_IDS = ['normal', 'hard', 'veryHard'] as const
export type Difficulty = (typeof DIFFICULTY_IDS)[number]

export interface DifficultyDef {
  readonly id: Difficulty
  readonly name: string
  readonly text: string
  readonly baseHealth: number
  readonly schedule: Schedule
  /** Multiplies the chance of golden and diamond items. */
  readonly luck: number
  /** Bosses get this share of extra health (rounded up) and extra attack. */
  readonly bossBoost: { readonly healthShare: number; readonly attack: number }
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  normal: {
    id: 'normal',
    name: 'Normal',
    text: '20 health, longer days, more golden and diamond items.',
    baseHealth: 20,
    schedule: NORMAL_SCHEDULE,
    luck: 3,
    bossBoost: { healthShare: 0, attack: 0 },
  },
  hard: {
    id: 'hard',
    name: 'Hard',
    text: '10 health and no bonuses.',
    baseHealth: 10,
    schedule: { daySteps: 40, nightSteps: 30 },
    luck: 1,
    bossBoost: { healthShare: 0, attack: 0 },
  },
  veryHard: {
    id: 'veryHard',
    name: 'Very Hard',
    text: '10 health, longer nights and stronger bosses.',
    baseHealth: 10,
    schedule: { daySteps: 40, nightSteps: 40 },
    luck: 1,
    bossBoost: { healthShare: 0.25, attack: 1 },
  },
}

export const isDifficulty = (value: unknown): value is Difficulty => (DIFFICULTY_IDS as readonly unknown[]).includes(value)

/** The clock for a run at its difficulty. */
export const timeOf = (state: { readonly step: number; readonly difficulty: Difficulty }): TimeOfWeek =>
  timeOfWeek(state.step, DIFFICULTIES[state.difficulty].schedule)

/** The boss as fought at this difficulty. */
export const empowerBoss = (boss: BossDef, difficulty: Difficulty): BossDef => {
  const { healthShare, attack } = DIFFICULTIES[difficulty].bossBoost
  if (healthShare === 0 && attack === 0) return boss
  const { stats } = boss
  return { ...boss, stats: { ...stats, maxHp: Math.ceil(stats.maxHp * (1 + healthShare)), attack: stats.attack + attack } }
}
