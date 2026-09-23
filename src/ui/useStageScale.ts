import { useEffect, useState } from 'react'

/** Virtual resolution of the game, matching He is Coming's 480×270 art grid. */
export const STAGE_W = 480
export const STAGE_H = 270

const computeScale = (): number =>
  Math.max(1, Math.floor(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)))

/** Largest integer scale at which the stage fits the window, so art pixels stay square and crisp. */
export function useStageScale(): number {
  const [scale, setScale] = useState(computeScale)
  useEffect(() => {
    const onResize = () => setScale(computeScale())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}
