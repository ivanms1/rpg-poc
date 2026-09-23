import { tileKey } from '../world/fog'
import { findPath } from '../world/pathing'
import type { Point } from '../world/types'
import type { RunState } from './types'

/**
 * Click-to-move route to `target` over tiles the hero has seen. Goes around live enemies and
 * locations that would open a dialog, except the target itself. `[]` when there's no way.
 */
export const planRoute = (state: RunState, target: Point): readonly Point[] => {
  if (state.screen.kind !== 'map' || !state.revealed.has(tileKey(target.x, target.y))) return []
  const blocked = new Set([
    ...state.world.pois.filter((p) => !p.used).map((p) => tileKey(p.x, p.y)),
    ...state.world.enemies.filter((e) => e.alive).map((e) => tileKey(e.x, e.y)),
  ])
  return findPath(state.world.map, state.player, target, blocked, state.revealed) ?? []
}
