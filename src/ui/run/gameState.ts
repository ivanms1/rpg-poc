/**
 * A run plus what the screen is busy showing about it. For now that's the reveal animation, during
 * which the run is paused: run actions are ignored until it ends or is skipped.
 */
import { runCues } from '../../audio/cues'
import type { SoundName } from '../../audio/sounds'
import { timeOf } from '../../core/run/difficulty'
import { runReducer } from '../../core/run/reducer'
import type { Content, RunAction, RunState } from '../../core/run/types'
import { sightRadius } from '../../core/world/clock'
import { farReveal } from '../../core/world/reveal'
import type { RevealShow } from '../../render/reveal'

export interface GameState {
  readonly run: RunState
  readonly reveal: RevealShow | null
}

export type GameAction = RunAction | { readonly type: 'revealDone' }

export const initGame = (run: RunState): GameState => ({ run, reveal: null })

export const gameReducer = (content: Content) => {
  const reduce = runReducer(content)
  return (game: GameState, action: GameAction): GameState => {
    if (action.type === 'revealDone') return game.reveal ? { ...game, reveal: null } : game
    if (game.reveal) return game
    const run = reduce(game.run, action)
    if (run === game.run) return game
    // A battle that starts in the same step (the boss arriving) takes over the screen, so no reveal.
    const reveal = run.screen.kind === 'battle' ? null : farReveal(game.run.revealed, run.revealed, run.player, sightRadius(timeOf(run).phase))
    return { run, reveal: reveal ? { reveal, before: game.run.revealed } : null }
  }
}

/** The run's sounds, with a reveal chime in place of footsteps and the dialog it holds back. */
export const gameCues = (prev: GameState, next: GameState): readonly SoundName[] => {
  const cues = runCues(prev.run, next.run)
  if (!next.reveal || next.reveal === prev.reveal) return cues
  return ['reveal', ...cues.filter((cue) => cue !== 'open' && cue !== 'step')]
}
