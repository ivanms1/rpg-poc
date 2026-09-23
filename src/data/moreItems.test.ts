import type { Source } from '../core/combat/types'
import { buildPlayer } from '../core/items/loadout'
import { ITEMS_BY_ID } from './items'
import { beforeTurn, dummy, fight, from, hero, strikes } from './testkit'
import { WEAPONS_BY_ID } from './weapons'

const stick = 'wooden-stick'
const hitter = (attack = 2, speed = 5, hp = 100) => dummy(hp, attack, 0, speed)
const twoStrikes: Source = { id: 'double', name: 'Double', kind: 'trait', strikesPerTurn: 2 }
const first = (events: ReturnType<typeof fight>['events'], name: string) => from(events, name)[0]

describe('more weapons', () => {
  it("Woodcutter's Axe: +2 attack per empty slot", () => {
    const p = buildPlayer({ weapon: { item: WEAPONS_BY_ID['woodcutters-axe']! }, items: [null, null, { item: ITEMS_BY_ID['leather-vest']! }, null] })
    expect(p.stats.attack).toBe(7)
  })

  it('Blackbriar Blade: +2 attack per thorn', () => {
    expect(strikes(fight(hero('blackbriar-blade', ['horned-helmet']), dummy()).events, 'player')[0]).toBe(3)
  })

  it('Bejeweled Blade: +2 attack per other jewelry item', () => {
    expect(hero('bejeweled-blade', ['sapphire-ring', 'emerald-ring']).stats.attack).toBe(5)
  })

  it('Ironstone Bow: loses speed on hit and then only strikes every other turn', () => {
    const r = fight(hero('ironstone-bow', [], { baseHealth: 60 }), dummy(80))
    expect(strikes(beforeTurn(r.events, 'player', 4), 'player')).toHaveLength(2)
  })

  it('Lifeblood Spear: +1 attack whenever you restore 3+ health', () => {
    expect(first(fight(hero('lifeblood-spear', ['emerald-ring'], { hp: 5 }), dummy()).events, 'Lifeblood Spear')).toMatchObject({ stat: 'attack', delta: 1 })
  })

  it('Icicle Spear: Exposed gives 1 freeze per water item', () => {
    const r = fight(hero('icicle-spear', ['frostbite-gauntlet', 'leather-vest']), hitter())
    expect(first(r.events, 'Icicle Spear')).toMatchObject({ type: 'status', side: 'enemy', status: 'freeze', delta: 2 })
  })

  it('Swiftstrike Bow: additional strikes are doubled', () => {
    expect(strikes(beforeTurn(fight(hero('swiftstrike-bow', ['swiftstrike-belt']), dummy()).events, 'enemy', 1), 'player')).toHaveLength(3)
  })

  it('Granite Hammer: On Hit converts 1 armor to 2 attack', () => {
    expect(strikes(fight(hero('granite-hammer', ['leather-vest']), dummy()).events, 'player').slice(0, 2)).toEqual([2, 4])
  })

  it('Granite Lance: base armor is doubled', () => {
    expect(hero('granite-lance', ['shield-of-the-hero']).stats.armor).toBe(10)
  })

  it('Royal Scepter: attack equals gold, capped at 10 gold', () => {
    expect(strikes(fight(hero('royal-scepter', [], { gold: 5 }), dummy()).events, 'player')[0]).toBe(5)
    expect(strikes(fight(hero('royal-scepter', [], { gold: 50 }), dummy()).events, 'player')[0]).toBe(10)
    expect(fight(hero('royal-scepter', ['gold-ring'], { gold: 10 }), dummy(1)).final.player.gold).toBe(10)
  })

  it('Royal Crownblade: On Hit gain 1 gold', () => {
    expect(first(fight(hero('royal-crownblade'), dummy()).events, 'Royal Crownblade')).toMatchObject({ type: 'gold', delta: 1 })
  })
})

describe('thorns and brambles', () => {
  it("Blackbriar Gauntlet: 2 thorns per armor the enemy's first strike removes", () => {
    const r = fight(hero(stick, ['blackbriar-gauntlet', 'shield-of-the-hero']), hitter())
    expect(first(r.events, 'Blackbriar Gauntlet')).toMatchObject({ status: 'thorns', delta: 4 })
  })

  it('Blackbriar Rose: gain 2 thorns when you heal', () => {
    expect(first(fight(hero(stick, ['blackbriar-rose', 'emerald-ring'], { hp: 5 }), dummy()).events, 'Blackbriar Rose')).toMatchObject({ status: 'thorns', delta: 2 })
  })

  it('Bramble Belt: 1 thorn, and the enemy strikes one extra time', () => {
    const r = fight(hero(stick, ['bramble-belt']), dummy(100, 1, 0, 5))
    expect(strikes(beforeTurn(r.events, 'player', 1), 'enemy')).toHaveLength(2)
  })

  it('Bramble Buckler: converts 1 armor to 2 thorns each turn', () => {
    const r = fight(hero(stick, ['bramble-buckler']), dummy())
    expect(from(r.events, 'Bramble Buckler').slice(0, 2).map((e) => e.type)).toEqual(['stat', 'status'])
  })

  it('Bramble Talisman: +1 armor whenever you gain thorns', () => {
    expect(first(fight(hero(stick, ['bramble-talisman', 'horned-helmet']), dummy()).events, 'Bramble Talisman')).toMatchObject({ stat: 'armor', delta: 1 })
  })

  it('Bramble Vest: the first time thorns are lost, heal that much', () => {
    const r = fight(hero(stick, ['bramble-vest', 'horned-helmet'], { hp: 5 }), dummy(100, 1, 0, 5))
    expect(from(r.events, 'Bramble Vest').filter((e) => e.type === 'heal')).toHaveLength(1)
  })

  it('Pinecone Breastplate: a thorn every turn, only if you start at full health', () => {
    expect(from(fight(hero(stick, ['pinecone-breastplate']), dummy()).events, 'Pinecone Breastplate').length).toBeGreaterThan(1)
    expect(from(fight(hero(stick, ['pinecone-breastplate'], { hp: 5 }), dummy()).events, 'Pinecone Breastplate')).toHaveLength(0)
  })

  it('Cactus Cap: thorns deal double against an unarmored enemy', () => {
    const r = fight(hero(stick, ['cactus-cap', 'horned-helmet']), dummy(100, 1, 0, 5))
    expect(from(r.events, 'Hero thorns')[0]).toMatchObject({ amount: 2 })
  })

  it("Granite Thorns: thorns survive the enemy's first 3 strikes", () => {
    const r = fight(hero(stick, ['granite-thorns', 'spiny-chestnut']), dummy(200, 1, 0, 5), { fatigueStartRound: 30 })
    expect(from(r.events, 'Hero thorns').length).toBeGreaterThanOrEqual(4)
  })
})

describe('frost', () => {
  it('Ice Spikes: +5 thorns at turn start while frozen', () => {
    expect(first(fight(hero(stick, ['ice-spikes', 'iceblock-shield']), dummy()).events, 'Ice Spikes')).toMatchObject({ status: 'thorns', delta: 5 })
  })

  it('Ice Tomb: with no armor, gain 3 armor and 1 freeze', () => {
    expect(from(fight(hero(stick, ['ice-tomb']), dummy()).events, 'Ice Tomb').slice(0, 2).map((e) => e.type)).toEqual(['stat', 'status'])
  })

  it('Frostbite Curse: 5 freeze to both', () => {
    const r = from(fight(hero(stick, ['frostbite-curse']), dummy()).events, 'Frostbite Curse')
    expect(r.map((e) => e.type === 'status' && e.side)).toEqual(['player', 'enemy'])
  })

  it("Frostbite Armor: the enemy's first strike is doubled, then they freeze", () => {
    const r = fight(hero(stick, ['frostbite-armor'], { baseHealth: 30 }), dummy(100, 3, 0, 5))
    expect(r.events.find((e) => e.type === 'damage' && e.side === 'player')).toMatchObject({ amount: 6 })
    expect(first(r.events, 'Frostbite Armor')).toMatchObject({ side: 'enemy', status: 'freeze', delta: 4 })
  })

  it('Frostbite Greaves: losing speed freezes the enemy', () => {
    expect(first(fight(hero(stick, ['frostbite-greaves', 'saffron-feather'], { hp: 5 }), dummy()).events, 'Frostbite Greaves')).toMatchObject({ side: 'enemy', status: 'freeze' })
  })

  it('Cold Resistance: freeze doubles attack', () => {
    expect(strikes(fight(hero(stick, ['cold-resistance', 'iceblock-shield']), dummy()).events, 'player')[0]).toBe(2)
  })
})

describe('stone and armor', () => {
  it('Ore Heart: 3 armor per stone item', () => {
    expect(first(fight(hero(stick, ['ore-heart', 'ironstone-sandals', 'cracked-whetstone']), dummy()).events, 'Ore Heart')).toMatchObject({ stat: 'armor', delta: 9 })
  })

  it('Granite Crown: max health equal to base armor', () => {
    expect(first(fight(hero(stick, ['granite-crown', 'shield-of-the-hero']), dummy()).events, 'Granite Crown')).toMatchObject({ stat: 'maxHp', delta: 3 })
  })

  it('Double-plated Vest: the second hit each turn grants 2 armor', () => {
    const r = fight(hero(stick, ['double-plated-vest'], { baseHealth: 30 }), dummy(100, 1, 0, 5, [twoStrikes]))
    expect(first(r.events, 'Double-plated Vest')).toMatchObject({ stat: 'armor', delta: 2 })
  })

  it('Royal Helmet: Exposed with more than 20 gold gives 10 armor', () => {
    expect(first(fight(hero(stick, ['royal-helmet'], { gold: 25 }), hitter()).events, 'Royal Helmet')).toMatchObject({ delta: 10 })
    expect(from(fight(hero(stick, ['royal-helmet'], { gold: 5 }), hitter()).events, 'Royal Helmet')).toHaveLength(0)
  })

  it("Brittlebark Buckler: all armor is lost after the enemy's first strike", () => {
    const r = fight(hero(stick, ['brittlebark-buckler']), hitter())
    expect(first(r.events, 'Brittlebark Buckler')).toMatchObject({ stat: 'armor', delta: -8 })
  })

  it('Plated Greaves: Exposed converts 3 speed to 9 armor', () => {
    const r = fight(hero(stick, ['plated-greaves', 'boots-of-the-hero', 'leather-vest']), hitter(2, 9))
    expect(from(r.events, 'Plated Greaves').map((e) => e.type === 'stat' && e.delta)).toEqual([-3, 9])
  })

  it('Shield Talisman: +1 on every armor gain', () => {
    expect(first(fight(hero(stick, ['shield-talisman', 'sapphire-earring']), dummy()).events, 'Sapphire Earring')).toMatchObject({ delta: 2 })
  })

  it('Ironskin Potion: armor equal to lost health', () => {
    expect(first(fight(hero(stick, ['ironskin-potion'], { hp: 5 }), dummy()).events, 'Ironskin Potion')).toMatchObject({ stat: 'armor', delta: 5 })
  })

  it('Iron Transfusion: +2 armor and -1 health each turn', () => {
    expect(from(fight(hero(stick, ['iron-transfusion']), dummy()).events, 'Iron Transfusion').slice(0, 2).map((e) => e.type)).toEqual(['stat', 'damage'])
  })

  it('Royal Shield: converts 1 gold to 3 armor each turn', () => {
    expect(from(fight(hero(stick, ['royal-shield'], { gold: 3 }), dummy()).events, 'Royal Shield').slice(0, 2).map((e) => e.type)).toEqual(['gold', 'stat'])
  })

  it('Brittlebark Armor: +12 health, but every hit deals 1 more', () => {
    const r = fight(hero(stick, ['brittlebark-armor']), hitter())
    expect(r.events.find((e) => e.type === 'damage' && e.side === 'player')).toMatchObject({ amount: 3 })
    expect(hero(stick, ['brittlebark-armor']).stats.maxHp).toBe(22)
  })

  it('Bloodmoon Armor: self-damage from items hits the enemy instead', () => {
    const r = fight(hero(stick, ['bloodmoon-armor', 'thorn-ring']), dummy())
    expect(first(r.events, 'Thorn Ring')).toMatchObject({ type: 'damage', side: 'enemy', amount: 5 })
  })

  it('Razor Scales: losing armor deals that much damage', () => {
    expect(first(fight(hero(stick, ['razor-scales', 'leather-vest']), hitter()).events, 'Razor Scales')).toMatchObject({ side: 'enemy', amount: 2 })
  })
})

describe('speed', () => {
  it('Featherweight Wings: when slower, gain attack equal to speed', () => {
    expect(first(fight(hero(stick, ['featherweight-wings', 'leather-vest']), hitter()).events, 'Featherweight Wings')).toMatchObject({ stat: 'attack', delta: 1 })
  })

  it('Featherweight Armor: speed gains also give armor', () => {
    expect(first(fight(hero(stick, ['featherweight-armor', 'citrine-earring']), dummy()).events, 'Featherweight Armor')).toMatchObject({ stat: 'armor', delta: 1 })
  })

  it('Featherweight Greaves: +1 speed at 0 speed', () => {
    expect(first(fight(hero(stick, ['featherweight-greaves']), dummy()).events, 'Featherweight Greaves')).toMatchObject({ stat: 'speed', delta: 1 })
  })

  it('Featherweight Helmet: spend 2 armor for 3 speed and 1 attack', () => {
    const r = from(fight(hero(stick, ['featherweight-helmet', 'leather-vest']), dummy()).events, 'Featherweight Helmet')
    expect(r.map((e) => e.type === 'stat' && `${e.stat}${e.delta}`)).toEqual(['armor-2', 'speed3', 'attack1'])
  })

  it('Swiftstrike Cloak: faster → 1 additional strike', () => {
    expect(strikes(beforeTurn(fight(hero(stick, ['swiftstrike-cloak']), dummy()).events, 'enemy', 1), 'player')).toHaveLength(2)
  })
})

describe('blood and healing', () => {
  it('Lifeblood Burst: healing 3+ deals 3 damage', () => {
    expect(first(fight(hero(stick, ['lifeblood-burst', 'emerald-ring'], { hp: 5 }), dummy()).events, 'Lifeblood Burst')).toMatchObject({ side: 'enemy', amount: 3 })
  })

  it('Iron Rose: +1 armor when you heal', () => {
    expect(first(fight(hero(stick, ['iron-rose', 'emerald-ring'], { hp: 5 }), dummy()).events, 'Iron Rose')).toMatchObject({ stat: 'armor', delta: 1 })
  })

  it('Sanguine Rose: heals 1 more', () => {
    expect(first(fight(hero(stick, ['sanguine-rose', 'emerald-ring'], { hp: 2 }), dummy()).events, 'Emerald Ring')).toMatchObject({ type: 'heal', amount: 4 })
  })

  it('Blood Chain: the enemy becoming wounded triggers your Wounded items', () => {
    const r = fight(hero('sword-of-the-hero', ['blood-chain', 'frostbite-trap']), dummy(10))
    expect(first(r.events, 'Frostbite Trap')).toMatchObject({ side: 'enemy', status: 'freeze', delta: 3 })
  })

  it('Heart-shaped Potion: at exactly 1 health, restore to full once', () => {
    const r = fight(hero(stick, ['heart-shaped-potion'], { hp: 3 }), hitter(2, 5, 200))
    expect(first(r.events, 'Heart-shaped Potion')).toMatchObject({ type: 'heal', amount: 9 })
  })

  it("Druid's Cloak: lost health becomes armor, and healing does nothing", () => {
    const r = fight(hero(stick, ['druids-cloak', 'emerald-ring'], { hp: 5 }), hitter())
    expect(from(r.events, 'Emerald Ring')).toHaveLength(0)
    expect(first(r.events, "Druid's Cloak")).toMatchObject({ stat: 'armor', delta: 2 })
  })

  it('Lifeblood Armor: half of current health becomes armor', () => {
    const r = from(fight(hero(stick, ['lifeblood-armor']), dummy()).events, 'Lifeblood Armor')
    expect(r.map((e) => e.type)).toEqual(['damage', 'stat'])
    expect(r[1]).toMatchObject({ delta: 5 })
  })
})

describe('bombs and non-weapon damage', () => {
  it('Cherry Bomb: 1 damage twice at battle start', () => {
    expect(from(fight(hero(stick, ['cherry-bomb']), dummy()).events, 'Cherry Bomb')).toHaveLength(2)
  })

  it('Firecracker Belt: Exposed deals 1 damage 4 times', () => {
    expect(from(fight(hero(stick, ['firecracker-belt', 'leather-vest']), hitter()).events, 'Firecracker Belt')).toHaveLength(4)
  })

  it('Explosive Powder: bombs deal 1 more', () => {
    expect(first(fight(hero(stick, ['explosive-powder', 'cherry-bomb']), dummy()).events, 'Cherry Bomb')).toMatchObject({ amount: 2 })
  })

  it('Double Explosion: the second non-weapon hit each turn adds 3 damage', () => {
    expect(first(fight(hero(stick, ['double-explosion', 'cherry-bomb']), dummy()).events, 'Double Explosion')).toMatchObject({ side: 'enemy', amount: 3 })
  })

  it('Sword Talisman: non-weapon damage +1, strikes unchanged', () => {
    const r = fight(hero(stick, ['sword-talisman', 'cherry-bomb']), dummy())
    expect(first(r.events, 'Cherry Bomb')).toMatchObject({ amount: 2 })
    expect(r.events.find((e) => e.type === 'damage' && e.source === 'strike')).toMatchObject({ amount: 1 })
  })

  it('Time Bomb: grows 2 damage every turn until Exposed', () => {
    const r = fight(hero(stick, ['time-bomb', 'leather-vest', 'boots-of-the-hero']), dummy(100, 2, 0, 0))
    expect(first(r.events, 'Time Bomb')).toMatchObject({ side: 'enemy', amount: 3 })
  })

  it('Chainlink Medallion: On Hit effects twice', () => {
    expect(from(beforeTurn(fight(hero('boom-stick', ['chainlink-medallion']), dummy()).events, 'enemy', 1), 'Boom Stick')).toHaveLength(2)
  })
})

describe('gems and misc', () => {
  it('Oak Heart: 3 max health per wood item (itself included)', () => {
    expect(hero(stick, ['oak-heart', 'redwood-cloak']).stats.maxHp).toBe(10 + 2 + 3 * 3)
  })

  it('Citrine Ring: spend 5 speed for a permanent extra strike', () => {
    const r = fight(hero('featherweight-blade', ['citrine-ring', 'boots-of-the-hero', 'leather-vest']), dummy(200), { fatigueStartRound: 30 })
    expect(strikes(beforeTurn(r.events, 'player', 3), 'player')).toHaveLength(4)
  })

  it('Citrine Gemstone: base speed is inverted', () => {
    expect(hero(stick, ['citrine-gemstone', 'boots-of-the-hero']).stats.speed).toBe(-2)
  })

  it('Emerald Gemstone: overhealing is dealt as damage', () => {
    expect(first(fight(hero(stick, ['emerald-gemstone', 'emerald-ring']), dummy()).events, 'Emerald Gemstone')).toMatchObject({ side: 'enemy', amount: 3 })
  })

  it('Ruby Gemstone: with exactly 1 attack, hits deal 4 extra', () => {
    expect(first(fight(hero(stick, ['ruby-gemstone']), dummy()).events, 'Ruby Gemstone')).toMatchObject({ side: 'enemy', amount: 4 })
    expect(from(fight(hero('sword-of-the-hero', ['ruby-gemstone']), dummy()).events, 'Ruby Gemstone')).toHaveLength(0)
  })

  it('Sapphire Gemstone: lost armor is restored as health', () => {
    expect(first(fight(hero(stick, ['sapphire-gemstone', 'leather-vest'], { hp: 5 }), hitter()).events, 'Sapphire Gemstone')).toMatchObject({ type: 'heal', amount: 2 })
  })
})
