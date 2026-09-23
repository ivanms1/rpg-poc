import { useCallback, useRef, useState } from 'react'
import type { SoundName } from '../../audio/sounds'
import { createSynth } from '../../audio/synth'

const MUTE_KEY = 'hic.muted'
const synth = createSynth()

const loadMuted = (): boolean => {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

const saveMuted = (muted: boolean) => {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // Storage unavailable (private mode): the choice just isn't remembered.
  }
}

export interface Sound {
  readonly muted: boolean
  readonly toggleMute: () => void
  /** Plays unless muted. */
  readonly play: (name: SoundName) => void
}

/** Sound effects with a remembered mute switch. */
export function useSound(): Sound {
  const [muted, setMuted] = useState(loadMuted)
  /** Read by `play`, which stays the same function so callers' effects don't re-run on a toggle. */
  const mutedNow = useRef(muted)
  const toggleMute = useCallback(() => {
    mutedNow.current = !mutedNow.current
    saveMuted(mutedNow.current)
    setMuted(mutedNow.current)
  }, [])
  const play = useCallback((name: SoundName) => {
    if (!mutedNow.current) synth.play(name)
  }, [])
  return { muted, toggleMute, play }
}
