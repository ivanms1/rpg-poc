/** Week structure: 3 days (50 steps) + 3 nights (30 steps), then the boss. See docs/research/mechanics.md §6. */
export type Phase = 'day' | 'night'

export interface Segment {
  readonly phase: Phase
  readonly steps: number
}

const DAY_STEPS = 50
const NIGHT_STEPS = 30
const DAYS_PER_WEEK = 3
const SIGHT: Record<Phase, number> = { day: 5, night: 3 }

export const WEEK_SEGMENTS: readonly Segment[] = Array.from({ length: DAYS_PER_WEEK }, () => [
  { phase: 'day', steps: DAY_STEPS },
  { phase: 'night', steps: NIGHT_STEPS },
] as const).flat()

export const STEPS_PER_WEEK = WEEK_SEGMENTS.reduce((sum, s) => sum + s.steps, 0)

export interface TimeOfWeek {
  readonly segment: number
  readonly phase: Phase
  /** 1-based day number; a night belongs to the day before it. */
  readonly day: number
  readonly stepInSegment: number
  readonly stepsLeftInSegment: number
  readonly bossDue: boolean
}

export const timeOfWeek = (step: number): TimeOfWeek => {
  if (step < 0) throw new RangeError(`timeOfWeek: negative step ${step}`)
  let remaining = Math.min(step, STEPS_PER_WEEK)
  for (let i = 0; i < WEEK_SEGMENTS.length; i++) {
    const seg = WEEK_SEGMENTS[i] as Segment
    const isLast = i === WEEK_SEGMENTS.length - 1
    if (remaining < seg.steps || isLast) {
      const stepInSegment = Math.min(remaining, seg.steps)
      return {
        segment: i,
        phase: seg.phase,
        day: Math.floor(i / 2) + 1,
        stepInSegment,
        stepsLeftInSegment: seg.steps - stepInSegment,
        bossDue: step >= STEPS_PER_WEEK,
      }
    }
    remaining -= seg.steps
  }
  throw new Error('unreachable: WEEK_SEGMENTS is empty')
}

export const sightRadius = (phase: Phase): number => SIGHT[phase]

/** Step at which the next day begins after sleeping (end of week after the last night). */
export const nextMorning = (step: number): number => {
  const { segment } = timeOfWeek(step)
  const nightIndex = WEEK_SEGMENTS[segment]?.phase === 'night' ? segment : segment + 1
  return WEEK_SEGMENTS.slice(0, nightIndex + 1).reduce((sum, s) => sum + s.steps, 0)
}
