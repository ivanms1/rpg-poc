import { useMemo } from 'react'
import { NORMAL_SCHEDULE, segmentsOf, stepsPerWeek, type Phase, type Schedule } from '../core/world/clock'
import { PALETTE } from '../render/palette'
import { PixelIcon } from './PixelIcon'

const TICK_EVERY = 5
const PHASE_COLOR: Record<Phase, string> = { day: PALETTE.speed, night: PALETTE.night }

interface Tick {
  readonly x: number
  readonly phase: Phase
  readonly major: boolean
}

const layout = (schedule: Schedule) => {
  const segments = segmentsOf(schedule)
  const startOf = (i: number) => segments.slice(0, i).reduce((sum, s) => sum + s.steps, 0)
  const ticks: readonly Tick[] = segments.flatMap((seg, i) =>
    Array.from({ length: Math.ceil(seg.steps / TICK_EVERY) }, (_, t) => ({ x: startOf(i) + t * TICK_EVERY, phase: seg.phase, major: t === 0 })),
  )
  const centers = segments.map((seg, i) => ({ phase: seg.phase, x: startOf(i) + seg.steps / 2 }))
  return { ticks, centers, total: stepsPerWeek(schedule) }
}

interface Props {
  readonly step: number
  readonly schedule?: Schedule
}

/** 1 art pixel per step: sun/moon per segment, skull (boss) at the end, marker at the current step. */
export function Timeline({ step, schedule = NORMAL_SCHEDULE }: Props) {
  const { ticks, centers, total } = useMemo(() => layout(schedule), [schedule])
  const clamped = Math.min(step, total)
  return (
    <div className="timeline" style={{ width: total + 8 }} aria-label={`Step ${clamped} of ${total}`}>
      <div className="timeline-icons">
        {centers.map(({ phase, x }, i) => (
          <span key={i} className="timeline-icon" style={{ left: x - 3, opacity: x < clamped ? 0.3 : 1 }}>
            <PixelIcon icon={phase === 'day' ? 'sun' : 'moon'} color={PHASE_COLOR[phase]} />
          </span>
        ))}
        <span className="timeline-icon" style={{ left: total }}>
          <PixelIcon icon="skull" color={PALETTE.enemy} />
        </span>
      </div>
      <svg width={total + 1} height={5} shapeRendering="crispEdges" className="timeline-bar">
        <rect x={0} y={2} width={total} height={1} fill={PALETTE.muted} opacity={0.4} />
        {ticks.map(({ x, phase, major }) => (
          <rect
            key={x}
            x={x}
            y={major ? 0 : 1}
            width={1}
            height={major ? 5 : 3}
            fill={x < clamped ? PALETTE.muted : PHASE_COLOR[phase]}
            opacity={x < clamped ? 0.4 : 1}
          />
        ))}
        <rect x={total} y={0} width={1} height={5} fill={PALETTE.enemy} />
      </svg>
      <span className="timeline-marker" style={{ left: clamped - 2 }} />
    </div>
  )
}
