import { CONTENT } from '../../data/content'
import type { EnemyEntity, Poi, Terrain, World } from '../world/types'
import { createRun } from './reducer'
import { planRoute } from './route'
import type { RunState } from './types'

/** A 9×3 corridor of path tiles; the hero starts at the left end of the middle row. */
const W = 9
const H = 3
const START = { x: 0, y: 1 }
const corridor = (): World['map'] => {
  const terrain: Terrain[] = Array.from({ length: W * H }, () => 'path')
  return { width: W, height: H, terrain, biome: terrain.map(() => 'start') }
}

const poi = (kind: Poi['kind'], x: number, y: number, used = false): Poi => ({ id: `${kind}@${x},${y}`, kind, x, y, used })
const enemy = (x: number, y: number, alive = true): EnemyEntity => ({ id: `rat@${x},${y}`, enemyId: 'rat', x, y, alive })

const everything = new Set(Array.from({ length: W * H }, (_, i) => `${i % W},${Math.floor(i / W)}`))
const run = (pois: readonly Poi[] = [], enemies: readonly EnemyEntity[] = []): RunState => ({
  ...createRun(1, CONTENT, { world: { map: corridor(), start: START, pois, enemies } }),
  revealed: everything,
})

describe('planRoute', () => {
  it('walks the shortest way to a revealed tile', () => {
    const route = planRoute(run(), { x: 3, y: 1 })
    expect(route).toEqual([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }])
  })

  it('steps around live enemies and unused locations, but may end on one', () => {
    const state = run([poi('chest', 1, 1)], [enemy(2, 0)])
    const route = planRoute(state, { x: 3, y: 0 })
    expect(route.some((p) => (p.x === 1 && p.y === 1) || (p.x === 2 && p.y === 0))).toBe(false)
    expect(route.at(-1)).toEqual({ x: 3, y: 0 })
    expect(planRoute(state, { x: 1, y: 1 })).toEqual([{ x: 1, y: 1 }])
  })

  it('walks straight over used locations and defeated enemies', () => {
    const route = planRoute(run([poi('chest', 1, 1, true)], [enemy(2, 1, false)]), { x: 3, y: 1 })
    expect(route).toHaveLength(3)
  })

  it('refuses hidden targets, routes through fog and dialogs', () => {
    const state = run()
    expect(planRoute({ ...state, revealed: new Set(['0,1', '1,1']) }, { x: 3, y: 1 })).toEqual([])
    expect(planRoute({ ...state, revealed: new Set(['0,1', '3,1']) }, { x: 3, y: 1 })).toEqual([])
    expect(planRoute({ ...state, screen: { kind: 'message', title: 'x', text: 'y' } }, { x: 3, y: 1 })).toEqual([])
  })
})
