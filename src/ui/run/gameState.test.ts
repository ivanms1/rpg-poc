import { createRun } from '../../core/run/reducer'
import type { RunState } from '../../core/run/types'
import { STEPS_PER_WEEK } from '../../core/world/clock'
import type { Poi, Terrain, World } from '../../core/world/types'
import { CONTENT } from '../../data/content'
import { gameCues, gameReducer, initGame, type GameAction, type GameState } from './gameState'

/** A 40×20 open field of path tiles; the hero starts in the middle-left. */
const W = 40
const H = 20
const START = { x: 10, y: 10 }
const field = (pois: readonly Poi[]): World => {
  const terrain: Terrain[] = Array.from({ length: W * H }, () => 'path')
  return { map: { width: W, height: H, terrain, biome: terrain.map(() => 'start') }, start: START, pois, enemies: [] }
}
const poi = (kind: Poi['kind'], x: number, y: number): Poi => ({ id: `${kind}@${x},${y}`, kind, x, y, used: false })

const reduce = gameReducer(CONTENT)
const play = (game: GameState, ...actions: GameAction[]): GameState => actions.reduce(reduce, game)
const right: GameAction = { type: 'move', dx: 1, dy: 0 }
const start = (pois: readonly Poi[]): GameState => initGame(createRun(1, CONTENT, { world: field(pois) }))

describe('game state: reveals', () => {
  it('plain walking plays no reveal', () => {
    const game = play(start([]), right, right)
    expect(game.reveal).toBeNull()
    expect(game.run.player).toEqual({ x: 12, y: 10 })
  })

  it('climbing a lookout tower starts a reveal spreading from the hero, and holds back its dialog', () => {
    const before = start([poi('lookout', 11, 10)])
    const game = play(before, right)
    expect(game.reveal?.reveal.center).toEqual({ x: 11, y: 10 })
    expect(game.reveal?.before).toBe(before.run.revealed)
    expect(game.run.screen).toMatchObject({ kind: 'message', title: 'Lookout Tower' })
    expect(gameCues(before, game)).toEqual(['reveal'])
  })

  it('the run is paused until the reveal ends or is skipped', () => {
    const game = play(start([poi('lookout', 11, 10)]), right)
    expect(play(game, { type: 'dismiss' })).toBe(game)
    const done = play(game, { type: 'revealDone' })
    expect(done.reveal).toBeNull()
    expect(done.run).toBe(game.run)
    expect(play(done, { type: 'dismiss' }).run.screen.kind).toBe('map')
    expect(play(done, { type: 'revealDone' })).toBe(done)
  })

  it('a crystal ball vision pans to the far-off location', () => {
    const base = start([poi('crystalBall', 11, 10), { ...poi('chest', 35, 3), id: 'far-chest' }])
    const picking = play(base, right)
    expect(picking.reveal).toBeNull()
    const screen = picking.run.screen
    if (screen.kind !== 'pick') throw new Error('expected the crystal ball choice')
    const chest = screen.options.findIndex((o) => o.id === 'far-chest')
    const seen = play(picking, { type: 'choose', index: chest })
    expect(seen.reveal?.reveal.center).toEqual({ x: 35, y: 3 })
    expect(seen.run.revealed.has('35,3')).toBe(true)
    expect(gameCues(picking, seen)).toEqual(['reveal'])
  })

  it('no reveal when the boss arrives on the same step', () => {
    const base = start([poi('crystalBall', 11, 10), { ...poi('chest', 35, 3), id: 'far-chest' }])
    const picking = play(base, right)
    const screen = picking.run.screen
    if (screen.kind !== 'pick') throw new Error('expected the crystal ball choice')
    const due: GameState = { ...picking, run: { ...picking.run, step: STEPS_PER_WEEK } }
    const seen = play(due, { type: 'choose', index: screen.options.findIndex((o) => o.id === 'far-chest') })
    expect(seen.run.screen.kind).toBe('battle')
    expect(seen.reveal).toBeNull()
  })

  it('cues pass through unchanged without a new reveal', () => {
    const game = start([])
    const moved = play(game, right)
    expect(gameCues(game, moved)).toEqual(['step'])
    const revealed: GameState = { ...moved, reveal: { reveal: { center: START, tiles: [], radius: 0 }, before: new Set() } }
    const run: RunState = { ...revealed.run, step: revealed.run.step + 1 }
    expect(gameCues(revealed, { ...revealed, run })).toEqual(['step'])
  })
})
