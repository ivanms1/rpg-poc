import { beforeTurn, dummy, fight, from, hero, strikes } from './testkit'
import { WEAPONS } from './weapons'

describe('weapons', () => {
  it('have unique ids', () => {
    expect(new Set(WEAPONS.map((w) => w.id)).size).toBe(WEAPONS.length)
  })

  it.each([
    ['wooden-stick', { attack: 1, armor: 0, speed: 0, maxHp: 10 }],
    ['sword-of-the-hero', { attack: 3, armor: 0, speed: 0, maxHp: 10 }],
    ['ironstone-greatsword', { attack: 4, armor: 0, speed: -2, maxHp: 10 }],
    ['redwood-rod', { attack: 2, armor: 0, speed: 0, maxHp: 14 }],
    ['spearshield-lance', { attack: 1, armor: 6, speed: 0, maxHp: 10 }],
    ['elderwood-staff', { attack: 1, armor: 1, speed: 1, maxHp: 10 }],
    ['featherweight-blade', { attack: 2, armor: 0, speed: 2, maxHp: 10 }],
  ])('%s adds its stats', (id, expected) => {
    expect(hero(id).stats).toEqual(expected)
  })

  it('Razorthorn Spear: On Hit gain 2 thorns', () => {
    const r = fight(hero('razorthorn-spear'), dummy())
    expect(from(r.events, 'Razorthorn Spear')[0]).toMatchObject({ type: 'status', status: 'thorns', delta: 2 })
  })

  it('Boom Stick: On Hit deal 1 damage', () => {
    const r = fight(hero('boom-stick'), dummy())
    expect(from(r.events, 'Boom Stick')[0]).toMatchObject({ type: 'damage', side: 'enemy', amount: 1 })
  })

  it('Heart Drinker: On Hit restore 1 health', () => {
    const r = fight(hero('heart-drinker', [], { hp: 5 }), dummy())
    expect(from(r.events, 'Heart Drinker')[0]).toMatchObject({ type: 'heal', side: 'player', amount: 1 })
  })

  it('Brittlebark Bow: after 3 strikes lose 2 attack', () => {
    const r = fight(hero('brittlebark-bow'), dummy(50))
    expect(strikes(r.events, 'player').slice(0, 4)).toEqual([4, 4, 4, 2])
  })

  it('Bloodmoon Dagger: Wounded gain 5 attack and take 2 damage', () => {
    const r = fight(hero('bloodmoon-dagger', [], { hp: 6 }), dummy(50, 1, 0, 1))
    expect(from(r.events, 'Bloodmoon Dagger').map((e) => e.type)).toEqual(['stat', 'damage'])
    expect(strikes(r.events, 'player')[0]).toBe(7)
  })

  it('Bloodmoon Sickle: On Hit take 1 damage', () => {
    const r = fight(hero('bloodmoon-sickle'), dummy())
    expect(from(r.events, 'Bloodmoon Sickle')[0]).toMatchObject({ type: 'damage', side: 'player', amount: 1 })
  })

  it('Frostbite Dagger: first turn gives freeze equal to attack on hit', () => {
    const r = fight(hero('frostbite-dagger'), dummy())
    expect(from(r.events, 'Frostbite Dagger')).toEqual([expect.objectContaining({ type: 'status', side: 'enemy', status: 'freeze', delta: 2 })])
  })

  it('Swiftstrike Rapier: faster → 2 additional strikes on the first turn', () => {
    const r = fight(hero('swiftstrike-rapier', ['boots-of-the-hero']), dummy())
    expect(strikes(beforeTurn(r.events, 'enemy', 1), 'player')).toHaveLength(3)
  })

  it('Swiftstrike Rapier: no bonus when not faster', () => {
    const r = fight(hero('swiftstrike-rapier'), dummy())
    expect(strikes(beforeTurn(r.events, 'enemy', 1), 'player')).toHaveLength(1)
  })

  it('Battle Axe: double attack while the enemy has armor', () => {
    const r = fight(hero('battle-axe'), dummy(30, 0, 5))
    expect(strikes(r.events, 'player').slice(0, 3)).toEqual([4, 4, 2])
  })

  it('Twin Blade: strikes twice', () => {
    const r = fight(hero('twin-blade'), dummy())
    expect(strikes(beforeTurn(r.events, 'enemy', 1), 'player')).toEqual([1, 1])
  })

  it('Quickgrowth Spear: every other turn gain 1 attack and restore 1 health', () => {
    const r = fight(hero('quickgrowth-spear', [], { hp: 5 }), dummy())
    expect(from(r.events, 'Quickgrowth Spear').slice(0, 2).map((e) => e.type)).toEqual(['stat', 'heal'])
    expect(strikes(r.events, 'player').slice(0, 3)).toEqual([3, 3, 4])
  })

  it('Lifesteal Scythe: heals for attack only while the enemy has no armor', () => {
    const r = fight(hero('lifesteal-scythe', [], { hp: 5 }), dummy(30, 0, 2))
    expect(from(beforeTurn(r.events, 'player', 2), 'Lifesteal Scythe')).toHaveLength(0)
    expect(from(r.events, 'Lifesteal Scythe')[0]).toMatchObject({ type: 'heal', amount: 1 })
  })

  it('Stoneslab Sword: On Hit gain 2 armor', () => {
    const r = fight(hero('stoneslab-sword'), dummy())
    expect(from(r.events, 'Stoneslab Sword')[0]).toMatchObject({ type: 'stat', stat: 'armor', delta: 2 })
  })

  it('Frozen Iceblade: 7 attack, but starts with 3 freeze', () => {
    const r = fight(hero('frozen-iceblade'), dummy(50))
    expect(strikes(r.events, 'player').slice(0, 4)).toEqual([3, 3, 3, 7])
  })

  it('Brittlebark Club: lose 2 attack on Exposed and on Wounded', () => {
    const r = fight(hero('brittlebark-club', ['shield-of-the-hero']), dummy(200, 4, 0, 1))
    expect(from(r.events, 'Brittlebark Club').map((e) => e.type === 'stat' && e.delta)).toEqual([-2, -2])
  })

  it('Bearclaw Blade: attack equals missing health', () => {
    const r = fight(hero('bearclaw-blade', [], { hp: 5 }), dummy(50))
    expect(strikes(r.events, 'player')[0]).toBe(10)
  })

  it('Mountain Cleaver: attack equals base armor', () => {
    const r = fight(hero('mountain-cleaver', ['shield-of-the-hero']), dummy(50))
    expect(strikes(r.events, 'player')[0]).toBe(5)
  })

  it('Tempest Blade: attack equals speed', () => {
    const r = fight(hero('tempest-blade', ['boots-of-the-hero']), dummy(50))
    expect(strikes(r.events, 'player')[0]).toBe(4)
  })
})
