import { STEPS_PER_WEEK, WEEK_SEGMENTS, type Phase } from '../core/world/clock'
import { PALETTE } from '../render/palette'
import { PixelIcon } from './PixelIcon'

const TICK_EVERY = 5
const PHASE_COLOR: Record<Phase, string> = { day: PALETTE.speed, night: PALETTE.night }

interface Tick {
  readonly x: number
  readonly phase: Phase
  readonly major: boolean
}

const TICKS: readonly Tick[] = WEEK_SEGMENTS.flatMap((seg, i) => {
  const start = WEEK_SEGMENTS.slice(0, i).reduce((sum, s) => sum + s.steps, 0)
  return Array.from({ length: seg.steps / TICK_EVERY }, (_, t) => ({ x: start + t * TICK_EVERY, phase: seg.phase, major: t === 0 }))
})

const SEGMENT_CENTERS = WEEK_SEGMENTS.map((seg, i) => ({
  phase: seg.phase,
  x: WEEK_SEGMENTS.slice(0, i).reduce((sum, s) => sum + s.steps, 0) + seg.steps / 2,
}))

/** 1 art pixel per step: sun/moon per segment, skull (boss) at the end, marker at the current step. */
export function Timeline({ step }: { readonly step: number }) {
  const clamped = Math.min(step, STEPS_PER_WEEK)
  return (
    <div className="timeline" style={{ width: STEPS_PER_WEEK + 8 }} aria-label={`Step ${clamped} of ${STEPS_PER_WEEK}`}>
      <div className="timeline-icons">
        {SEGMENT_CENTERS.map(({ phase, x }, i) => (
          <span key={i} className="timeline-icon" style={{ left: x - 3, opacity: x < clamped ? 0.3 : 1 }}>
            <PixelIcon icon={phase === 'day' ? 'sun' : 'moon'} color={PHASE_COLOR[phase]} />
          </span>
        ))}
        <span className="timeline-icon" style={{ left: STEPS_PER_WEEK }}>
          <PixelIcon icon="skull" color={PALETTE.enemy} />
        </span>
      </div>
      <svg width={STEPS_PER_WEEK + 1} height={5} shapeRendering="crispEdges" className="timeline-bar">
        <rect x={0} y={2} width={STEPS_PER_WEEK} height={1} fill={PALETTE.muted} opacity={0.4} />
        {TICKS.map(({ x, phase, major }) => (
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
        <rect x={STEPS_PER_WEEK} y={0} width={1} height={5} fill={PALETTE.enemy} />
      </svg>
      <span className="timeline-marker" style={{ left: clamped - 2 }} />
    </div>
  )
}
