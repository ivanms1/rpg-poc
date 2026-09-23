import { activeSets, buildPlayer, setProgress, type Loadout } from './loadout'
import type { EdgeDef, ItemDef, SetDef } from './types'

const def = (id: string, kind: ItemDef['kind'], stats: ItemDef['stats'] = {}): ItemDef => ({ id, name: id, kind, rarity: 'common', tags: [], stats, text: '' })
const blade = def('blade', 'weapon', { attack: 2 })
const boots = def('boots', 'item', { speed: 1 })
const shield = def('shield', 'item', { armor: 3 })
const edge: EdgeDef = { id: 'sharp-edge', name: 'Sharp Edge', text: 'Battle Start: Gain 1 attack', effect: () => ({ attackBonus: () => 1 }) }
const trio: SetDef = { id: 'trio', name: 'Trio', parts: ['blade', 'boots', 'shield'], text: 'Gain 2 speed', stats: { speed: 2 } }
const withEdge: SetDef = { id: 'edgy', name: 'Edgy', parts: ['boots', 'sharp-edge'], text: '', effect: () => ({ strikesPerTurn: 2 }) }

const loadout = (extra: Partial<Loadout> = {}): Loadout => ({
  weapon: { item: blade },
  items: [{ item: boots }, null, { item: shield }],
  ...extra,
})

describe('buildPlayer — weapon upgrades and sets', () => {
  it('blade oils add +1 of their stat', () => {
    expect(buildPlayer(loadout({ oils: ['attack', 'speed'] })).stats).toMatchObject({ attack: 3, speed: 2 })
  })

  it('an edge becomes its own source right after the weapon', () => {
    const sources = buildPlayer(loadout({ edge })).sources
    expect(sources.map((s) => s.kind)).toEqual(['weapon', 'edge', 'item', 'item'])
    expect(sources[1]).toMatchObject({ name: 'Sharp Edge', text: 'Battle Start: Gain 1 attack' })
  })

  it('a set needs every part; then it adds its stats and a set source', () => {
    expect(activeSets(loadout(), [trio])).toEqual([trio])
    const p = buildPlayer(loadout({ sets: [trio] }))
    expect(p.stats.speed).toBe(3)
    expect(p.sources.at(-1)).toMatchObject({ kind: 'set', name: 'Trio' })
    const partial = loadout({ items: [{ item: boots }], sets: [trio] })
    expect(activeSets(partial, [trio])).toEqual([])
    expect(buildPlayer(partial).stats.speed).toBe(1)
  })

  it('edges count as set parts', () => {
    expect(activeSets(loadout({ edge }), [withEdge])).toEqual([withEdge])
    expect(activeSets(loadout(), [withEdge])).toEqual([])
    expect(buildPlayer(loadout({ edge, sets: [withEdge] })).sources.at(-1)).toMatchObject({ kind: 'set', strikesPerTurn: 2 })
  })
})

describe('setProgress', () => {
  it('lists the sets a part belongs to with equipped counts', () => {
    expect(setProgress(loadout({ items: [{ item: boots }] }), [trio, withEdge], 'boots')).toEqual([
      { set: trio, owned: 2, total: 3 },
      { set: withEdge, owned: 1, total: 2 },
    ])
    expect(setProgress(loadout(), [trio], 'nothing')).toEqual([])
  })
})
