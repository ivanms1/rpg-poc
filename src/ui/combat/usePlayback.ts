import { useCallback, useEffect, useState } from 'react'
import type { BattleEvent } from '../../core/combat/types'
import { beatDuration, type Speed } from './playback'

export interface Playback {
  readonly index: number
  readonly event: BattleEvent | undefined
  readonly done: boolean
  readonly skip: () => void
}

/** Steps through `events`, holding each for its beat. Remount (change `key`) to replay a new battle. */
export function usePlayback(events: readonly BattleEvent[], speed: Speed, paused: boolean): Playback {
  const [index, setIndex] = useState(0)
  const last = events.length - 1
  const done = index >= last

  useEffect(() => {
    const current = events[index]
    if (paused || done || !current) return
    const timer = window.setTimeout(() => setIndex((i) => Math.min(i + 1, last)), beatDuration(current, speed))
    return () => window.clearTimeout(timer)
  }, [events, index, last, done, paused, speed])

  const skip = useCallback(() => setIndex(last), [last])

  return { index, event: events[index], done, skip }
}
