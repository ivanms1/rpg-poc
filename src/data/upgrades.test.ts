import { buildPlayer } from '../core/items/loadout'
import { EDGES, EDGES_BY_ID } from './edges'
import { ITEMS_BY_ID } from './items'
import { SETS, SETS_BY_ID } from './sets'
import { beforeTurn, dummy, fight, from, strikes } from './testkit'
import { WEAPONS_BY_ID } from './weapons'

const kit = (weaponId: string, itemIds: readonly string[] = [], edgeId?: string, hp?: number) =>
  buildPlayer({
    weapon: { item: WEAPONS_BY_ID[weaponId]! },
    items: itemIds.map((id) => ({ item: ITEMS_BY_ID[id]! })),
    edge: edgeId ? EDGES_BY_ID[edgeId]! : null,
    sets: SETS,
    baseHealth: 30,
    hp,
  })

const withEdge = (edgeId: string, hp?: number) => kit('sword-of-the-hero', [], edgeId, hp)

describe('forge edges', () => {
  it('have unique ids and text', () => {
    expect(new Set(EDGES.map((e) => e.id)).size).toBe(EDGES.length)
    expect(EDGES.every((e) => e.text.length > 0)).toBe(true)
  })

  it('Agile Edge: 1 additional strike on the first turn', () => {
    expect(strikes(beforeTurn(fight(withEdge('agile-edge'), dummy()).events, 'enemy', 1), 'player')).toHaveLength(2)
  })

  it.each([
    ['bleeding-edge', 'Bleeding Edge', 'heal'],
    ['blunt-edge', 'Blunt Edge', 'stat'],
    ['cutting-edge', 'Cutting Edge', 'damage'],
    ['gilded-edge', 'Gilded Edge', 'gold'],
    ['razor-edge', 'Razor Edge', 'stat'],
    ['oaken-edge', 'Oaken Edge', 'status'],
    ['freezing-edge', 'Freezing Edge', 'status'],
    ['stormcloud-edge', 'Stormcloud Edge', 'status'],
    ['oozing-edge', 'Oozing Edge', 'status'],
  ])('%s has its effect', (id, name, type) => {
    expect(from(fight(withEdge(id, 20), dummy()).events, name)[0]).toMatchObject({ type })
  })

  it('Jagged Edge: gain 2 thorns and take 1 damage on hit', () => {
    const effects = from(fight(withEdge('jagged-edge'), dummy()).events, 'Jagged Edge')
    expect(effects.slice(0, 2)).toEqual([
      expect.objectContaining({ type: 'status', status: 'thorns', delta: 2 }),
      expect.objectContaining({ type: 'damage', side: 'player', amount: 1 }),
    ])
  })

  it('Featherweight Edge converts 1 speed to 1 attack on hit; Plated Edge converts 1 speed to 3 armor', () => {
    const quick = kit('featherweight-blade', [], 'featherweight-edge')
    expect(strikes(fight(quick, dummy()).events, 'player').slice(0, 2)).toEqual([2, 3])
    const plated = from(fight(kit('featherweight-blade', [], 'plated-edge'), dummy()).events, 'Plated Edge')
    expect(plated.slice(0, 2).map((e) => e.type === 'stat' && e.stat)).toEqual(['speed', 'armor'])
  })

  it('Petrified Edge: double attack, but stuns yourself on hit', () => {
    const r = fight(withEdge('petrified-edge'), dummy(60))
    expect(strikes(r.events, 'player')[0]).toBe(6)
    expect(from(r.events, 'Petrified Edge')[0]).toMatchObject({ type: 'status', side: 'player', status: 'stun' })
  })

  it('Whirlpool Edge: every 3 strikes gives the enemy 1 riptide', () => {
    const r = fight(withEdge('whirlpool-edge'), dummy(60))
    expect(from(beforeTurn(r.events, 'player', 3), 'Whirlpool Edge')).toHaveLength(0)
    expect(from(beforeTurn(r.events, 'player', 4), 'Whirlpool Edge')).toHaveLength(1)
  })
})

describe('sets', () => {
  it('reference real parts', () => {
    const known = new Set([...Object.keys(ITEMS_BY_ID), ...Object.keys(WEAPONS_BY_ID), ...Object.keys(EDGES_BY_ID)])
    for (const set of SETS) for (const part of set.parts) expect(known.has(part)).toBe(true)
  })

  it("Hero's Return: +2 attack, armor and speed", () => {
    const p = kit('sword-of-the-hero', ['boots-of-the-hero', 'shield-of-the-hero'])
    expect(p.stats).toMatchObject({ attack: 5, armor: 5, speed: 4 })
    expect(p.sources.at(-1)).toMatchObject({ kind: 'set', name: "Hero's Return" })
  })

  it('Raw Hide: +1 attack every other turn', () => {
    const r = fight(kit('wooden-stick', ['leather-boots', 'leather-glove', 'leather-vest']), dummy())
    expect(from(r.events, 'Raw Hide')[0]).toMatchObject({ type: 'stat', stat: 'attack', delta: 1 })
  })

  it('Redwood Crown: Wounded restores health to full', () => {
    const r = fight(kit('redwood-rod', ['redwood-cloak', 'redwood-helmet']), dummy(200, 12, 0, 5))
    const heal = from(r.events, 'Redwood Crown')[0]
    expect(heal).toMatchObject({ type: 'heal' })
  })

  it('Saffron Talon: On Hit gain 1 speed', () => {
    expect(from(fight(kit('featherweight-blade', ['saffron-feather']), dummy()).events, 'Saffron Talon')[0]).toMatchObject({ stat: 'speed', delta: 1 })
  })

  it('Elderwood Mask: Battle Start doubles base attack, armor and speed', () => {
    const r = fight(kit('elderwood-staff', ['elderwood-necklace']), dummy())
    expect(r.events.find((e) => e.type === 'turnStart')?.snapshot.player).toMatchObject({ attack: 4, armor: 4, speed: 4 })
  })

  it('Bloodmoon Strike: after Wounded, next turn strikes heal their damage', () => {
    const r = fight(kit('bloodmoon-dagger', ['swiftstrike-gauntlet']), dummy(300, 16, 0, 5), { fatigueStartRound: 30 })
    expect(from(r.events, 'Bloodmoon Strike').some((e) => e.type === 'heal')).toBe(true)
  })

  it('Briar Greaves: whenever you take damage gain 1 thorn', () => {
    const r = fight(kit('wooden-stick', ['assault-greaves'], 'jagged-edge'), dummy(100, 2, 0, 5))
    expect(from(r.events, 'Briar Greaves')[0]).toMatchObject({ type: 'status', status: 'thorns', delta: 1 })
    expect(SETS_BY_ID['briar-greaves']?.parts).toContain('jagged-edge')
  })
})
