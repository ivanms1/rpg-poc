import { describeItem } from '../core/items/loadout'
import { ITEMS, ITEMS_BY_ID } from './items'
import { beforeTurn, dummy, fight, from, hero, strikes } from './testkit'

const stick = 'wooden-stick'
const statusGain = (status: string, delta: number, side = 'player') => expect.objectContaining({ type: 'status', status, delta, side })

describe('items', () => {
  it('have unique ids', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length)
  })

  it.each([
    ['leather-glove', { maxHp: 13, attack: 1, armor: 0, speed: 1 }],
    ['leather-vest', { maxHp: 10, attack: 1, armor: 2, speed: 1 }],
    ['boots-of-the-hero', { maxHp: 10, attack: 1, armor: 0, speed: 2 }],
    ['shield-of-the-hero', { maxHp: 10, attack: 1, armor: 3, speed: 0 }],
    ['elderwood-necklace', { maxHp: 10, attack: 2, armor: 1, speed: 1 }],
    ['emerald-crown', { maxHp: 18, attack: 0, armor: 0, speed: 0 }],
    ['ruby-crown', { maxHp: 10, attack: 2, armor: 0, speed: -1 }],
    ['sapphire-crown', { maxHp: 8, attack: 1, armor: 5, speed: 0 }],
    ['redwood-roast', { maxHp: 15, attack: 1, armor: 0, speed: 0 }],
  ])('%s adds its stats', (id, expected) => {
    expect(hero(stick, [id]).stats).toEqual(expected)
  })

  describe('tiers', () => {
    it('golden doubles stats and effect numbers; diamond quadruples', () => {
      expect(hero(null, ['horned-helmet'], { tier: 'golden' }).stats.armor).toBe(4)
      expect(hero(null, ['horned-helmet'], { tier: 'diamond' }).stats.armor).toBe(8)
      const r = fight(hero(stick, ['horned-helmet'], { tier: 'golden' }), dummy())
      expect(from(r.events, 'Horned Helmet')[0]).toEqual(statusGain('thorns', 2))
    })

    it('scales the {n} placeholders in item text', () => {
      const ruby = ITEMS_BY_ID['ruby-ring']!
      expect(describeItem(ruby)).toBe('Battle Start: Gain 2 attack and take 3 damage')
      expect(describeItem(ruby, 'diamond')).toBe('Battle Start: Gain 8 attack and take 12 damage')
    })
  })

  describe('battle start', () => {
    it('Horned Helmet: gain 1 thorns', () => {
      expect(from(fight(hero(stick, ['horned-helmet']), dummy()).events, 'Horned Helmet')[0]).toEqual(statusGain('thorns', 1))
    })

    it('Iceblock Shield: gain 2 freeze', () => {
      expect(from(fight(hero(stick, ['iceblock-shield']), dummy()).events, 'Iceblock Shield')[0]).toEqual(statusGain('freeze', 2))
    })

    it('Redwood Cloak: restore 2 only when hurt', () => {
      expect(from(fight(hero(stick, ['redwood-cloak']), dummy()).events, 'Redwood Cloak')).toHaveLength(0)
      expect(from(fight(hero(stick, ['redwood-cloak'], { hp: 5 }), dummy()).events, 'Redwood Cloak')[0]).toMatchObject({ type: 'heal', amount: 2 })
    })

    it('Swiftstrike Belt: take 3 damage and gain 1 additional strike', () => {
      const r = fight(hero(stick, ['swiftstrike-belt']), dummy())
      expect(from(r.events, 'Swiftstrike Belt')[0]).toMatchObject({ type: 'damage', side: 'player', amount: 3 })
      expect(strikes(beforeTurn(r.events, 'enemy', 1), 'player')).toHaveLength(2)
    })

    it('Frostbite Gauntlet: give the enemy 1 freeze', () => {
      expect(from(fight(hero(stick, ['frostbite-gauntlet']), dummy()).events, 'Frostbite Gauntlet')[0]).toEqual(statusGain('freeze', 1, 'enemy'))
    })

    it('Leather Boots: +2 attack only when faster', () => {
      expect(strikes(fight(hero(stick, ['leather-boots', 'boots-of-the-hero']), dummy()).events, 'player')[0]).toBe(3)
      expect(strikes(fight(hero(stick, ['leather-boots']), dummy()).events, 'player')[0]).toBe(1)
    })

    it('Thorn Ring: take 5 damage and gain 10 thorns', () => {
      const r = fight(hero(stick, ['thorn-ring'], { baseHealth: 20 }), dummy())
      expect(from(r.events, 'Thorn Ring').map((e) => e.type)).toEqual(['damage', 'status'])
    })

    it('Iron Shrapnel: 3 damage, doubled against an unarmored enemy', () => {
      expect(from(fight(hero(stick, ['iron-shrapnel']), dummy(30, 0, 2)).events, 'Iron Shrapnel')[0]).toMatchObject({ amount: 3 })
      expect(from(fight(hero(stick, ['iron-shrapnel']), dummy()).events, 'Iron Shrapnel')[0]).toMatchObject({ amount: 6 })
    })

    it('Heart-shaped Acorn: full heal with 0 base armor', () => {
      expect(from(fight(hero(stick, ['heart-shaped-acorn'], { hp: 2 }), dummy()).events, 'Heart-shaped Acorn')[0]).toMatchObject({ amount: 8 })
      expect(from(fight(hero(stick, ['heart-shaped-acorn', 'leather-vest'], { hp: 2 }), dummy()).events, 'Heart-shaped Acorn')).toHaveLength(0)
    })

    it('Emerald Ring: restore 3 health', () => {
      expect(from(fight(hero(stick, ['emerald-ring'], { hp: 2 }), dummy()).events, 'Emerald Ring')[0]).toMatchObject({ type: 'heal', amount: 3 })
    })

    it('Ruby Ring: gain 2 attack and take 3 damage', () => {
      const r = fight(hero(stick, ['ruby-ring']), dummy())
      expect(strikes(r.events, 'player')[0]).toBe(3)
      expect(from(r.events, 'Ruby Ring')[1]).toMatchObject({ type: 'damage', amount: 3 })
    })

    it('Sapphire Ring: steal 2 armor', () => {
      const r = fight(hero(stick, ['sapphire-ring']), dummy(30, 0, 5))
      expect(r.events.find((e) => e.type === 'turnStart')?.snapshot).toMatchObject({ player: { armor: 2 }, enemy: { armor: 3 } })
    })

    it('Gold Ring: gain 1 gold', () => {
      expect(fight(hero(stick, ['gold-ring']), dummy(1)).final.player.gold).toBe(1)
    })

    it('Spiny Chestnut: gain 3 thorns', () => {
      expect(from(fight(hero(stick, ['spiny-chestnut']), dummy()).events, 'Spiny Chestnut')[0]).toEqual(statusGain('thorns', 3))
    })

    it('Stone Steak: 5 armor only at full health', () => {
      expect(from(fight(hero(stick, ['stone-steak']), dummy()).events, 'Stone Steak')).toHaveLength(1)
      expect(from(fight(hero(stick, ['stone-steak'], { hp: 9 }), dummy()).events, 'Stone Steak')).toHaveLength(0)
    })

    it('Blacksmith Bond: Exposed can trigger twice', () => {
      const r = fight(hero(stick, ['blacksmith-bond', 'double-plated-armor', 'leather-vest']), dummy(200, 3, 0, 5))
      expect(from(r.events, 'Double-plated Armor')).toHaveLength(2)
    })
  })

  describe('exposed and wounded', () => {
    const armoredHit = dummy(200, 3, 0, 5)

    it('Redwood Helmet: Exposed restore 3 health', () => {
      expect(from(fight(hero(stick, ['redwood-helmet']), armoredHit).events, 'Redwood Helmet')[0]).toMatchObject({ type: 'heal' })
    })

    it('Double-plated Armor: Exposed gain 3 armor', () => {
      expect(from(fight(hero(stick, ['double-plated-armor']), armoredHit).events, 'Double-plated Armor')).toEqual([
        expect.objectContaining({ type: 'stat', stat: 'armor', delta: 3 }),
      ])
    })

    it('Cracked Bouldershield: Exposed gain 7 armor', () => {
      expect(from(fight(hero(stick, ['cracked-bouldershield', 'leather-vest']), armoredHit).events, 'Cracked Bouldershield')[0]).toMatchObject({ delta: 7 })
    })

    it('Blastcap Armor: Exposed take 5 damage', () => {
      expect(from(fight(hero(stick, ['blastcap-armor']), dummy(200, 8, 0, 5)).events, 'Blastcap Armor')[0]).toMatchObject({ type: 'damage', amount: 5 })
    })

    it('Explosive Surprise: Exposed deal 6 damage', () => {
      expect(from(fight(hero(stick, ['explosive-surprise', 'leather-vest']), armoredHit).events, 'Explosive Surprise')[0]).toMatchObject({ side: 'enemy', amount: 6 })
    })

    it('Frostbite Trap: Wounded give the enemy 3 freeze', () => {
      expect(from(fight(hero(stick, ['frostbite-trap']), dummy(200, 5, 0, 5)).events, 'Frostbite Trap')[0]).toEqual(statusGain('freeze', 3, 'enemy'))
    })

    it('Swiftstrike Gauntlet: Wounded gain 2 additional strikes', () => {
      const r = fight(hero(stick, ['swiftstrike-gauntlet']), dummy(200, 5, 0, 5))
      expect(strikes(beforeTurn(r.events, 'enemy', 2), 'player')).toHaveLength(3)
    })

    it('Chainmail Armor: Wounded regain base armor', () => {
      const r = fight(hero(stick, ['chainmail-armor', 'leather-vest']), dummy(200, 7, 0, 5))
      expect(from(r.events, 'Chainmail Armor')[0]).toMatchObject({ stat: 'armor', delta: 2 })
    })

    it('Razor Breastplate: Wounded gain thorns equal to enemy attack', () => {
      expect(from(fight(hero(stick, ['razor-breastplate']), dummy(200, 8, 0, 5)).events, 'Razor Breastplate')[0]).toEqual(statusGain('thorns', 8))
    })

    it('Vampiric Wine: Wounded restore 4 health', () => {
      expect(from(fight(hero(stick, ['vampiric-wine']), dummy(200, 5, 0, 5)).events, 'Vampiric Wine')[0]).toMatchObject({ type: 'heal', amount: 4 })
    })
  })

  describe('turn start and every other turn', () => {
    it('Saffron Feather: convert 1 speed to 2 health', () => {
      const r = fight(hero(stick, ['saffron-feather'], { hp: 5 }), dummy())
      expect(from(r.events, 'Saffron Feather').map((e) => e.type)).toEqual(['stat', 'heal'])
    })

    it('Fortified Gauntlet: +1 armor at turn start while armored', () => {
      const r = fight(hero(stick, ['fortified-gauntlet', 'leather-vest']), dummy())
      expect(from(beforeTurn(r.events, 'player', 3), 'Fortified Gauntlet')).toHaveLength(2)
      expect(from(fight(hero(stick, ['fortified-gauntlet']), dummy()).events, 'Fortified Gauntlet')).toHaveLength(0)
    })

    it('Moonlight Shield: +2 armor below 50% health', () => {
      expect(from(fight(hero(stick, ['moonlight-shield'], { hp: 4 }), dummy()).events, 'Moonlight Shield')[0]).toMatchObject({ delta: 2 })
    })

    it('earrings fire on turns 1, 3, 5…', () => {
      const r = fight(hero(stick, ['ruby-earring']), dummy())
      expect(from(beforeTurn(r.events, 'player', 4), 'Ruby Earring')).toHaveLength(2)
    })

    it.each([
      ['citrine-earring', 'Citrine Earring', 'stat'],
      ['emerald-earring', 'Emerald Earring', 'heal'],
      ['sapphire-earring', 'Sapphire Earring', 'stat'],
    ])('%s works', (id, name, type) => {
      expect(from(fight(hero(stick, [id], { hp: 5 }), dummy()).events, name)[0]).toMatchObject({ type })
    })
  })

  describe('passive and on hit', () => {
    it('Cracked Whetstone: +2 attack on the first turn only', () => {
      expect(strikes(fight(hero(stick, ['cracked-whetstone']), dummy()).events, 'player').slice(0, 2)).toEqual([3, 1])
    })

    it('Ironstone Sandals: +3 attack while armored', () => {
      expect(strikes(fight(hero(stick, ['ironstone-sandals', 'leather-vest']), dummy()).events, 'player')[0]).toBe(4)
      expect(strikes(fight(hero(stick, ['ironstone-sandals']), dummy()).events, 'player')[0]).toBe(1)
    })

    it('Lifeblood Helmet: first turn heals the strike damage', () => {
      expect(from(fight(hero('sword-of-the-hero', ['lifeblood-helmet'], { hp: 5 }), dummy()).events, 'Lifeblood Helmet')).toEqual([
        expect.objectContaining({ type: 'heal', amount: 3 }),
      ])
    })

    it('Studded Gauntlet: On Hit deal 1 damage', () => {
      expect(from(fight(hero(stick, ['studded-gauntlet']), dummy()).events, 'Studded Gauntlet')[0]).toMatchObject({ side: 'enemy', amount: 1 })
    })
  })

  describe('whenever you take damage', () => {
    const hitter = dummy(200, 2, 0, 5)

    it('Blackbriar Armor: gain 2 thorns', () => {
      expect(from(fight(hero(stick, ['blackbriar-armor']), hitter).events, 'Blackbriar Armor')[0]).toEqual(statusGain('thorns', 2))
    })

    it('Assault Greaves: deal 1 damage', () => {
      expect(from(fight(hero(stick, ['assault-greaves']), hitter).events, 'Assault Greaves')[0]).toMatchObject({ side: 'enemy', amount: 1 })
    })

    it('Crimson Cloak: restore 1 health', () => {
      expect(from(fight(hero(stick, ['crimson-cloak']), hitter).events, 'Crimson Cloak')[0]).toMatchObject({ type: 'heal', amount: 1 })
    })

    it('Ironstone Armor: enemy strikes deal 2 less while armored', () => {
      const r = fight(hero(stick, ['ironstone-armor', 'shield-of-the-hero']), dummy(200, 3, 0, 5))
      expect(r.events.find((e) => e.type === 'damage' && e.side === 'player')).toMatchObject({ amount: 1 })
    })

    it('Ironstone Bracelet: 1 less while armored, 1 more otherwise', () => {
      const r = fight(hero(stick, ['ironstone-bracelet', 'leather-vest']), dummy(200, 3, 0, 5))
      const hits = r.events.flatMap((e) => (e.type === 'damage' && e.side === 'player' && e.source === 'strike' ? [e.amount] : []))
      expect(hits.slice(0, 2)).toEqual([2, 4])
    })
  })
})
