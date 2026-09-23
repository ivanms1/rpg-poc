/** Week structure: 3 days + 3 nights, then the boss. See docs/research/mechanics.md §6. */
export type Phase = 'day' | 'night'

export interface Segment {
  readonly phase: Phase
  readonly steps: number
}

/** How long days and nights last (set by the difficulty). */
export interface Schedule {
  readonly daySteps: number
  readonly nightSteps: number
}

/** Normal difficulty: 50-step days and 30-step nights. */
export const NORMAL_SCHEDULE: Schedule = { daySteps: 50, nightSteps: 30 }

const DAYS_PER_WEEK = 3
const SIGHT: Record<Phase, number> = { day: 5, night: 3 }

export const segmentsOf = (schedule: Schedule): readonly Segment[] =>
  Array.from({ length: DAYS_PER_WEEK }, () => [
    { phase: 'day', steps: schedule.daySteps },
    { phase: 'night', steps: schedule.nightSteps },
  ] as const).flat()

export const stepsPerWeek = (schedule: Schedule): number => DAYS_PER_WEEK * (schedule.daySteps + schedule.nightSteps)

/** The Normal week, for callers that don't care about difficulty. */
export const WEEK_SEGMENTS: readonly Segment[] = segmentsOf(NORMAL_SCHEDULE)
export const STEPS_PER_WEEK = stepsPerWeek(NORMAL_SCHEDULE)

/** The run ends with week 3's boss. */
export const FINAL_WEEK = 3

/** 0 at the start of the run, 1 when the final boss arrives: how far the land has withered. */
export const withering = (week: number, step: number, schedule: Schedule = NORMAL_SCHEDULE): number => {
  const perWeek = stepsPerWeek(schedule)
  return Math.min(1, Math.max(0, ((week - 1) * perWeek + step) / (FINAL_WEEK * perWeek)))
}

export interface TimeOfWeek {
  readonly segment: number
  readonly phase: Phase
  /** 1-based day number; a night belongs to the day before it. */
  readonly day: number
  readonly stepInSegment: number
  readonly stepsLeftInSegment: number
  readonly bossDue: boolean
}

export const timeOfWeek = (step: number, schedule: Schedule = NORMAL_SCHEDULE): TimeOfWeek => {
  if (step < 0) throw new RangeError(`timeOfWeek: negative step ${step}`)
  const segments = segmentsOf(schedule)
  const perWeek = stepsPerWeek(schedule)
  let remaining = Math.min(step, perWeek)
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i] as Segment
    const isLast = i === segments.length - 1
    if (remaining < seg.steps || isLast) {
      const stepInSegment = Math.min(remaining, seg.steps)
      return {
        segment: i,
        phase: seg.phase,
        day: Math.floor(i / 2) + 1,
        stepInSegment,
        stepsLeftInSegment: seg.steps - stepInSegment,
        bossDue: step >= perWeek,
      }
    }
    remaining -= seg.steps
  }
  throw new Error('unreachable: a week has no segments')
}

export const sightRadius = (phase: Phase): number => SIGHT[phase]

/** Step at which the next day begins after sleeping (end of week after the last night). */
export const nextMorning = (step: number, schedule: Schedule = NORMAL_SCHEDULE): number => {
  const segments = segmentsOf(schedule)
  const { segment } = timeOfWeek(step, schedule)
  const nightIndex = segments[segment]?.phase === 'night' ? segment : segment + 1
  return segments.slice(0, nightIndex + 1).reduce((sum, s) => sum + s.steps, 0)
}
