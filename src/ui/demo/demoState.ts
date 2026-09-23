import { sightRadius, timeOfWeek } from '../../core/world/clock'
import { revealAround } from '../../core/world/fog'
import type { DemoMap } from './demoMap'

/** Walk-around state for the Phase 0 mock. Superseded by core/run/reducer in Phase 3. */
export interface DemoState {
  readonly player: { readonly x: number; readonly y: number }
  readonly step: number
  readonly revealed: ReadonlySet<string>
}

export type DemoAction = { readonly type: 'move'; readonly dx: number; readonly dy: number }

export const initDemoState = (map: DemoMap): DemoState => ({
  player: map.start,
  step: 0,
  revealed: revealAround(new Set(), map.start.x, map.start.y, sightRadius('day')),
})

const clamp = (value: number, max: number): number => Math.min(max, Math.max(0, value))

export const demoReducer =
  (map: DemoMap) =>
  (state: DemoState, action: DemoAction): DemoState => {
    const player = { x: clamp(state.player.x + action.dx, map.width - 1), y: clamp(state.player.y + action.dy, map.height - 1) }
    const step = state.step + 1
    return { player, step, revealed: revealAround(state.revealed, player.x, player.y, sightRadius(timeOfWeek(step).phase)) }
  }
