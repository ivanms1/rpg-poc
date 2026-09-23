import { createDemoMap } from './demoMap'
import { demoReducer, initDemoState } from './demoState'

describe('demo walk state', () => {
  const map = createDemoMap(1, 20, 10)
  const reduce = demoReducer(map)

  it('moves one tile and ticks the clock per step', () => {
    const next = reduce(initDemoState(map), { type: 'move', dx: 1, dy: 0 })
    expect(next.player).toEqual({ x: map.start.x + 1, y: map.start.y })
    expect(next.step).toBe(1)
  })

  it('clamps to the map edge but still spends the step', () => {
    let state = initDemoState(map)
    for (let i = 0; i < 30; i++) state = reduce(state, { type: 'move', dx: 0, dy: 1 })
    expect(state.player.y).toBe(map.height - 1)
    expect(state.step).toBe(30)
  })

  it('does not mutate the previous state', () => {
    const start = initDemoState(map)
    const size = start.revealed.size
    reduce(start, { type: 'move', dx: -1, dy: 0 })
    expect(start.step).toBe(0)
    expect(start.revealed.size).toBe(size)
  })
})
