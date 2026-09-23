import { useEffect, useState, type ReactNode } from 'react'
import { STAGE_H, STAGE_W, useStageScale } from './useStageScale'

/** The integer-scaled 480×270 stage with the optional CRT overlay (C toggles it). */
export function Stage({ children }: { readonly children: (scale: number) => ReactNode }) {
  const scale = useStageScale()
  const [crt, setCrt] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c' && !(e.target instanceof HTMLInputElement)) setCrt((on) => !on)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="viewport">
      <div className="stage-wrap" style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
        <div className="stage" style={{ transform: `scale(${scale})` }} data-testid="stage">
          {children(scale)}
          {crt && <div className="crt" aria-hidden="true" />}
        </div>
      </div>
    </div>
  )
}
