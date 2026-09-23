import { useEffect, useState } from 'react'

/** Virtual resolution of the game, matching He is Coming's 480×270 art grid. */
export const STAGE_W = 480
export const STAGE_H = 270

/** Below this fit, whole-number scaling would waste most of the screen, so small screens scale freely. */
const INTEGER_FROM = 2

export interface StageFit {
  readonly scale: number
  /** A narrow portrait screen: the game wants the device turned sideways. */
  readonly portrait: boolean
}

/**
 * The largest whole-number scale that fits, so art pixels stay square and crisp. Small screens (phones)
 * get a fractional scale that fills them instead.
 */
export const fitStage = (width: number, height: number): StageFit => {
  const fit = Math.min(width / STAGE_W, height / STAGE_H)
  const scale = fit >= INTEGER_FROM ? Math.floor(fit) : fit
  return { scale, portrait: height > width && width < STAGE_W * INTEGER_FROM }
}

const current = (): StageFit => fitStage(window.innerWidth, window.innerHeight)

export function useStageFit(): StageFit {
  const [fit, setFit] = useState(current)
  useEffect(() => {
    const onResize = () => setFit(current())
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])
  return fit
}
