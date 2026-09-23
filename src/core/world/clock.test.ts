import { FINAL_WEEK, STEPS_PER_WEEK, WEEK_SEGMENTS, nextMorning, sightRadius, timeOfWeek, withering } from './clock'

describe('clock', () => {
  it('has 3 days of 50 steps and 3 nights of 30 steps', () => {
    expect(WEEK_SEGMENTS.map((s) => [s.phase, s.steps])).toEqual([
      ['day', 50], ['night', 30],
      ['day', 50], ['night', 30],
      ['day', 50], ['night', 30],
    ])
    expect(STEPS_PER_WEEK).toBe(240)
  })

  it('starts on day 1', () => {
    expect(timeOfWeek(0)).toEqual({ segment: 0, phase: 'day', day: 1, stepInSegment: 0, stepsLeftInSegment: 50, bossDue: false })
  })

  it('turns to night after 50 steps', () => {
    expect(timeOfWeek(49)).toMatchObject({ phase: 'day', stepsLeftInSegment: 1 })
    expect(timeOfWeek(50)).toMatchObject({ segment: 1, phase: 'night', day: 1, stepInSegment: 0 })
  })

  it('starts day 2 after the first night', () => {
    expect(timeOfWeek(80)).toMatchObject({ segment: 2, phase: 'day', day: 2 })
  })

  it('reports the boss is due once the week is used up', () => {
    expect(timeOfWeek(239)).toMatchObject({ segment: 5, phase: 'night', day: 3, bossDue: false })
    expect(timeOfWeek(240)).toMatchObject({ segment: 5, phase: 'night', stepsLeftInSegment: 0, bossDue: true })
    expect(timeOfWeek(999).bossDue).toBe(true)
  })

  it('rejects negative steps', () => {
    expect(() => timeOfWeek(-1)).toThrow(RangeError)
  })

  it('sees 5 tiles by day and 3 by night', () => {
    expect(sightRadius('day')).toBe(5)
    expect(sightRadius('night')).toBe(3)
  })
})

describe('nextMorning', () => {
  it('jumps from any point of a night to the start of the next day', () => {
    expect(nextMorning(50)).toBe(80)
    expect(nextMorning(79)).toBe(80)
    expect(nextMorning(130)).toBe(160)
  })

  it('from the last night jumps to the end of the week (boss time)', () => {
    expect(nextMorning(210)).toBe(STEPS_PER_WEEK)
  })

  it('by day jumps past the coming night too', () => {
    expect(nextMorning(10)).toBe(80)
  })
})

describe('withering', () => {
  it('grows from 0 at the start to 1 when the final boss arrives', () => {
    expect(withering(1, 0)).toBe(0)
    expect(withering(2, 0)).toBeCloseTo(1 / 3)
    expect(withering(2, STEPS_PER_WEEK / 2)).toBeCloseTo(0.5)
    expect(withering(FINAL_WEEK, STEPS_PER_WEEK)).toBe(1)
  })

  it('stays within 0–1', () => {
    expect(withering(9, 0)).toBe(1)
    expect(withering(0, 0)).toBe(0)
  })
})
