import { useEffect, useState, type ReactNode } from 'react'
import { STAGE_H, STAGE_W, useStageFit } from './useStageScale'

/** The scaled 480×270 stage with the optional CRT overlay (C toggles it). */
export function Stage({ children }: { readonly children: (scale: number) => ReactNode }) {
  const { scale, portrait } = useStageFit()
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
      {portrait && (
        <div className="rotate-hint" role="status">
          Turn your device sideways to play.
        </div>
      )}
    </div>
  )
}
