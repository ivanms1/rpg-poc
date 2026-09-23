import { CONTENT } from '../../data/content'
import { EDGES } from '../../data/edges'
import { ITEMS_BY_ID } from '../../data/items'
import { WEAPONS_BY_ID } from '../../data/weapons'
import { isWalkable } from '../world/terrain'
import { createRun, runReducer } from './reducer'
import { deserializeRun, isSaveable, SAVE_VERSION, serializeRun } from './save'
import type { RunAction, RunState } from './types'

const reduce = runReducer(CONTENT)
const play = (state: RunState, ...actions: RunAction[]): RunState => actions.reduce(reduce, state)

/** A run with some history: gear, upgrades, gold, used and opened locations, a dead enemy. */
const played = (): RunState => {
  const s = createRun(991, CONTENT)
  const pois = s.world.pois.map((p, i) =>
    i === 1 ? { ...p, used: true } : i === 2 ? { ...p, offer: [{ item: ITEMS_BY_ID['ruby-ring']!, tier: 'golden' as const }] } : p,
  )
  const enemies = s.world.enemies.map((e, i) => (i === 0 ? { ...e, alive: false } : e))
  return play(
    {
      ...s,
      world: { ...s.world, pois, enemies },
      hero: {
        ...s.hero,
        gold: 7,
        hp: 13,
        weapon: { item: WEAPONS_BY_ID['frozen-iceblade']! },
        items: [{ item: ITEMS_BY_ID['leather-vest']!, tier: 'diamond' }, null, null, null],
        oils: ['speed'],
        edge: EDGES[3]!,
      },
    },
    { type: 'move', dx: 1, dy: 0 },
  )
}

const roundTrip = (state: RunState) => deserializeRun(JSON.parse(JSON.stringify(serializeRun(state))), CONTENT)

describe('save / load', () => {
  it('round-trips a run through JSON', () => {
    const state = played()
    const loaded = roundTrip(state)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.state).toEqual({ ...state, screen: { kind: 'map' } })
  })

  it('stores items by id, not whole definitions', () => {
    const json = JSON.stringify(serializeRun(played()))
    expect(json).toContain('"frozen-iceblade"')
    expect(json).not.toContain('effect')
    expect(json.length).toBeLessThan(20_000)
  })

  it('reopening dialogs after a load shows the same offer', () => {
    const s = createRun(991, CONTENT)
    const chest = s.world.pois.find((p) => p.kind === 'chest')!
    const [dx, dy] = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).find(([ox, oy]) => isWalkable(s.world.map, chest.x - ox, chest.y - oy))!
    const opened = play({ ...s, player: { x: chest.x - dx, y: chest.y - dy } }, { type: 'move', dx, dy })
    expect(opened.screen.kind).toBe('choice')
    if (opened.screen.kind !== 'choice') return
    const loaded = roundTrip(opened)
    if (!loaded.ok) throw new Error(loaded.error)
    expect(loaded.state.world.pois.find((p) => p.id === chest.id)?.offer).toEqual(opened.screen.options)
  })

  it('only saves between battles', () => {
    expect(isSaveable(createRun(1, CONTENT))).toBe(true)
    const s = createRun(1, CONTENT)
    expect(isSaveable({ ...s, screen: { kind: 'gameOver' } })).toBe(false)
    expect(isSaveable(play(s, { type: 'fightBoss' }))).toBe(false)
  })

  it('rejects malformed data, other versions and unknown ids', () => {
    expect(deserializeRun(null, CONTENT)).toMatchObject({ ok: false })
    expect(deserializeRun({ version: 99 }, CONTENT)).toMatchObject({ ok: false })
    const data = serializeRun(played())
    expect(deserializeRun({ ...data, version: SAVE_VERSION + 1 }, CONTENT)).toMatchObject({ ok: false })
    const badItem = { ...data, hero: { ...data.hero, weapon: { id: 'no-such-sword', tier: 'normal' } } }
    expect(deserializeRun(badItem, CONTENT)).toMatchObject({ ok: false, error: expect.stringContaining('no-such-sword') })
  })
})
