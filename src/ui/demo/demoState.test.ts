import type { Loadout } from '../../core/items/loadout'
import { ITEMS_BY_ID } from '../../data/items'
import { WEAPONS_BY_ID } from '../../data/weapons'
import { createDemoMap, type DemoMap, type Poi } from './demoMap'
import { demoReducer, initDemoState, type DemoState } from './demoState'

const strong: Loadout = { weapon: { item: WEAPONS_BY_ID['sword-of-the-hero']! }, items: [{ item: ITEMS_BY_ID['leather-vest']! }] }
const weak: Loadout = { weapon: null, items: [], baseHealth: 1 }

const withEnemyNextToStart = (map: DemoMap, enemyId = 'wolf'): DemoMap => {
  const poi: Poi = { x: map.start.x + 1, y: map.start.y, kind: 'enemy', tile: 'skull', enemyId }
  return { ...map, pois: [poi] }
}

const move = (dx: number, dy: number) => ({ type: 'move', dx, dy }) as const

describe('demo walk state', () => {
  const map = createDemoMap(1, 20, 10)
  const reduce = demoReducer({ ...map, pois: [] }, strong)

  it('starts at full health', () => {
    expect(initDemoState(map, strong)).toMatchObject({ hp: 10, gold: 0, battle: null, gameOver: false })
  })

  it('moves one tile and ticks the clock per step', () => {
    const next = reduce(initDemoState(map, strong), move(1, 0))
    expect(next.player).toEqual({ x: map.start.x + 1, y: map.start.y })
    expect(next.step).toBe(1)
  })

  it('clamps to the map edge but still spends the step', () => {
    let state = initDemoState(map, strong)
    for (let i = 0; i < 30; i++) state = reduce(state, move(0, 1))
    expect(state.player.y).toBe(map.height - 1)
    expect(state.step).toBe(30)
  })

  it('does not mutate the previous state', () => {
    const start = initDemoState(map, strong)
    const size = start.revealed.size
    reduce(start, move(-1, 0))
    expect(start.step).toBe(0)
    expect(start.revealed.size).toBe(size)
  })
})

describe('demo battles', () => {
  const map = withEnemyNextToStart(createDemoMap(1, 20, 10))

  it('walking onto an enemy starts a battle and blocks movement', () => {
    const reduce = demoReducer(map, strong)
    const inBattle = reduce(initDemoState(map, strong), move(1, 0))
    expect(inBattle.battle?.enemyName).toBe('Wolf')
    expect(reduce(inBattle, move(1, 0))).toBe(inBattle)
  })

  it('a win keeps the remaining health, pays gold and removes the enemy', () => {
    const reduce = demoReducer(map, strong)
    const inBattle = reduce(initDemoState(map, strong), move(1, 0))
    const after = reduce(inBattle, { type: 'finishBattle' })
    expect(after.battle).toBeNull()
    expect(after.hp).toBe(inBattle.battle?.result.final.player.hp)
    expect(after.gold).toBe(1)
    expect(after.defeated.has(0)).toBe(true)
    const again = reduce(reduce(after, move(-1, 0)), move(1, 0))
    expect(again.battle).toBeNull()
  })

  it('a loss ends the run until restart', () => {
    const reduce = demoReducer(map, weak)
    const lost: DemoState = reduce(reduce(initDemoState(map, weak), move(1, 0)), { type: 'finishBattle' })
    expect(lost.gameOver).toBe(true)
    expect(reduce(lost, move(0, 1))).toBe(lost)
    expect(reduce(lost, { type: 'restart' })).toMatchObject({ gameOver: false, step: 0, hp: 1 })
  })

  it('a loss shows the health the hero died with', () => {
    const reduce = demoReducer(map, weak)
    const inBattle = reduce(initDemoState(map, weak), move(1, 0))
    const lost = reduce(inBattle, { type: 'finishBattle' })
    expect(lost.hp).toBe(Math.max(0, inBattle.battle!.result.final.player.hp))
  })

  it('restart is ignored while a battle is playing', () => {
    const reduce = demoReducer(map, strong)
    const inBattle = reduce(initDemoState(map, strong), move(1, 0))
    expect(reduce(inBattle, { type: 'restart' })).toBe(inBattle)
  })

  it('finishBattle without a battle does nothing', () => {
    const reduce = demoReducer(map, strong)
    const start = initDemoState(map, strong)
    expect(reduce(start, { type: 'finishBattle' })).toBe(start)
  })
})
