/**
 * The reveal animation as a pure timeline: the camera glides to the newly revealed area (zooming out
 * if it doesn't fit), the tiles appear in a glowing ring spreading from its centre, it holds, then
 * the camera glides back to the hero.
 */
import type { Point } from '../core/world/types'
import type { Reveal } from '../core/world/reveal'
import { boundsOf, fitBounds } from './camera'

export const PAN_MS = 500
export const HOLD_MS = 700
export const RETURN_MS = 450
/** Time for a newly shown tile's glow to fade. */
export const GLOW_MS = 450
/** Spread time grows with the square root of the tiles revealed, clamped so small visions and big towers both read well. */
const SPREAD_MS_PER_ROOT_TILE = 60
const SPREAD_MIN_MS = 600
const SPREAD_MAX_MS = 1400

/** A reveal to play over the fog as it was `before` it. */
export interface RevealShow {
  readonly reveal: Reveal
  readonly before: ReadonlySet<string>
}

export interface View {
  readonly px: number
  readonly focus: Point
}

export interface RevealPlan {
  readonly home: View
  readonly away: View
  readonly spreadMs: number
  readonly totalMs: number
  /** Milliseconds into the animation when each new tile appears. */
  readonly appearAt: ReadonlyMap<string, number>
}

export interface RevealFrame extends View {
  readonly visible: (key: string) => boolean
  /** 0–1 brightness of a tile that just appeared. */
  readonly glow: (key: string) => number
  readonly done: boolean
}

export const planReveal = (reveal: Reveal, home: View, canvasWidth: number, canvasHeight: number): RevealPlan => {
  const bounds = boundsOf(reveal.tiles.map((t) => t.key))
  const away = bounds ? fitBounds(canvasWidth, canvasHeight, bounds, home.px) : home
  // The ring starts at the nearest new tile, so a tower's already-seen middle doesn't stall the spread.
  const distance = (t: { x: number; y: number }) => Math.hypot(t.x - reveal.center.x, t.y - reveal.center.y)
  const inner = Math.min(...reveal.tiles.map(distance))
  const reach = Math.max(1, reveal.radius - inner)
  const spreadMs = Math.min(SPREAD_MAX_MS, Math.max(SPREAD_MIN_MS, Math.sqrt(reveal.tiles.length) * SPREAD_MS_PER_ROOT_TILE))
  const appearAt = new Map(reveal.tiles.map((t) => [t.key, PAN_MS + ((distance(t) - inner) / reach) * spreadMs]))
  return { home, away, spreadMs, totalMs: PAN_MS + spreadMs + HOLD_MS + RETURN_MS, appearAt }
}

const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const between = (from: View, to: View, t: number): View => {
  const e = ease(Math.min(1, Math.max(0, t)))
  return { px: Math.round(lerp(from.px, to.px, e)), focus: { x: lerp(from.focus.x, to.focus.x, e), y: lerp(from.focus.y, to.focus.y, e) } }
}

/** The camera and fog `elapsed` ms into the animation, on top of the fog from before the reveal. */
export const revealFrame = (plan: RevealPlan, before: ReadonlySet<string>, elapsed: number): RevealFrame => {
  const returnAt = plan.totalMs - RETURN_MS
  const view = elapsed < PAN_MS ? between(plan.home, plan.away, elapsed / PAN_MS) : elapsed < returnAt ? plan.away : between(plan.away, plan.home, (elapsed - returnAt) / RETURN_MS)
  const shownAt = (key: string) => plan.appearAt.get(key) ?? Infinity
  return {
    ...view,
    visible: (key) => before.has(key) || shownAt(key) <= elapsed,
    glow: (key) => {
      const age = elapsed - shownAt(key)
      return age >= 0 && age < GLOW_MS ? 1 - age / GLOW_MS : 0
    },
    done: elapsed >= plan.totalMs,
  }
}
