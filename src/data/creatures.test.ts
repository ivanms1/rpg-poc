import { creatureCombatant } from '../core/items/loadout'
import { BOSSES_BY_ID } from './bosses'
import { ENEMIES, ENEMIES_BY_ID, enemyAt } from './enemies'
import { beforeTurn, dummy, fight, from, hero, strikes } from './testkit'

const foe = (id: string, level: 1 | 2 | 3 = 1) => creatureCombatant(enemyAt(ENEMIES_BY_ID[id]!, level))
const boss = (id: string) => creatureCombatant(BOSSES_BY_ID[id]!)

describe('regular enemies', () => {
  it('have three levels with rising health', () => {
    for (const e of ENEMIES) {
      const hp = e.levels.map((l) => l.stats.maxHp)
      expect(hp[2]).toBeGreaterThanOrEqual(hp[0]!)
    }
  })

  it('level text reflects the level value', () => {
    expect(enemyAt(ENEMIES_BY_ID['hedgehog']!, 3).text).toBe('Battle Start: Hedgehog gains 5 thorns')
  })

  it('Bear: extra attack while the player has armor', () => {
    const r = fight(hero('wooden-stick', ['leather-vest']), foe('bear'))
    expect(strikes(r.events, 'enemy')[0]).toBe(4)
    const bare = fight(hero('wooden-stick'), foe('bear'))
    expect(strikes(bare.events, 'enemy')[0]).toBe(1)
  })

  it('Spider: deals damage at battle start if faster', () => {
    expect(from(fight(hero('wooden-stick'), foe('spider', 2)).events, 'Spider')[0]).toMatchObject({ type: 'damage', amount: 4 })
    expect(from(fight(hero('wooden-stick', ['boots-of-the-hero']), foe('spider')).events, 'Spider')).toHaveLength(0)
  })

  it('Wolf: extra attack while the player has 5 or less health', () => {
    const r = fight(hero('wooden-stick', [], { hp: 5 }), foe('wolf', 1))
    expect(strikes(r.events, 'enemy')[0]).toBe(3)
  })

  it('Bat: heals on every other strike', () => {
    const r = fight(hero('wooden-stick', [], { baseHealth: 30 }), foe('bat', 3), { fatigueStartRound: 20 })
    const heals = from(r.events, 'Bat')
    expect(heals.length).toBeGreaterThan(0)
    expect(heals.every((e) => e.type === 'heal')).toBe(true)
  })

  it('Hedgehog: gains thorns and hurts whoever hits it', () => {
    const r = fight(hero('sword-of-the-hero'), foe('hedgehog', 2))
    expect(from(r.events, 'Hedgehog')[0]).toMatchObject({ type: 'status', status: 'thorns', delta: 4 })
    expect(from(r.events, 'Hedgehog thorns')[0]).toMatchObject({ side: 'player', amount: 4 })
  })

  it('Raven: steals gold on hit', () => {
    const r = fight(hero(null, [], { gold: 5 }), foe('raven', 2))
    expect(from(r.events, 'Raven').filter((e) => e.type === 'gold' && e.side === 'player')[0]).toMatchObject({ delta: -2 })
  })
})

describe('week 1 bosses', () => {
  it('Black Knight: gains the player attack + 2', () => {
    const r = fight(hero('sword-of-the-hero'), boss('black-knight'))
    expect(strikes(r.events, 'enemy')[0]).toBe(5)
  })

  it('Bloodmoon Werewolf: +5 attack while the player is below 50%', () => {
    const r = fight(hero('wooden-stick', [], { hp: 4 }), boss('bloodmoon-werewolf'))
    expect(strikes(r.events, 'enemy')[0]).toBe(8)
  })

  it('Brittlebark Beast: takes 3 extra damage per hit', () => {
    const r = fight(hero('wooden-stick'), boss('brittlebark-beast'))
    expect(r.events.find((e) => e.type === 'damage' && e.side === 'enemy')).toMatchObject({ amount: 4 })
  })

  it('Ironstone Golem: loses 3 attack when exposed', () => {
    const r = fight(hero('ironstone-greatsword', [], { baseHealth: 100 }), boss('ironstone-golem'), { fatigueStartRound: 50 })
    expect(from(r.events, 'Ironstone Golem')[0]).toMatchObject({ type: 'stat', stat: 'attack', delta: -3 })
    expect(strikes(r.events, 'enemy').at(-1)).toBe(1)
  })

  it('Razorclaw Grizzly: ignores armor', () => {
    const r = fight(hero('spearshield-lance'), boss('razorclaw-grizzly'))
    expect(r.events.find((e) => e.type === 'damage' && e.side === 'player')).toMatchObject({ armorLost: 0, hpLost: 3 })
  })

  it('Razortusk Hog: first strike +10 when faster', () => {
    const r = fight(hero('wooden-stick', [], { baseHealth: 30 }), boss('razortusk-hog'))
    expect(strikes(r.events, 'enemy').slice(0, 2)).toEqual([14, 4])
    const quick = fight(hero('featherweight-blade', ['boots-of-the-hero']), boss('razortusk-hog'))
    expect(strikes(beforeTurn(quick.events, 'player', 2), 'enemy')).toEqual([4])
  })
})

describe('a realistic week-1 fight', () => {
  it('a starter kit beats a level 1 wolf but not the Black Knight bare-handed', () => {
    const kit = hero('sword-of-the-hero', ['leather-vest', 'horned-helmet'])
    expect(fight(kit, foe('wolf')).winner).toBe('player')
    expect(fight(hero('wooden-stick'), boss('black-knight')).winner).toBe('enemy')
  })

  it('is deterministic', () => {
    const kit = () => hero('razorthorn-spear', ['horned-helmet', 'ruby-earring', 'crimson-cloak'])
    expect(fight(kit(), boss('brittlebark-beast')).events).toEqual(fight(kit(), boss('brittlebark-beast')).events)
  })

  it('dummy helper is not a trait-bearing creature', () => {
    expect(dummy().sources).toHaveLength(0)
  })
})

describe('week 2 bosses', () => {
  it('Blackbriar King: never strikes, gains 2 thorns when hurt and 4 when wounded', () => {
    const r = fight(hero('sword-of-the-hero', [], { baseHealth: 60 }), boss('blackbriar-king'), { fatigueStartRound: 30 })
    expect(strikes(r.events, 'enemy')).toHaveLength(0)
    const gains = from(r.events, 'Blackbriar King').filter((e) => e.type === 'status').map((e) => e.type === 'status' && e.delta)
    expect(gains.slice(0, 2)).toEqual([2, 2])
    expect(gains).toContain(4)
  })

  it('Frostbite Druid: freezes the player on hit', () => {
    const r = fight(hero('wooden-stick', [], { baseHealth: 30 }), boss('frostbite-druid'))
    expect(from(r.events, 'Frostbite Druid')[0]).toMatchObject({ type: 'status', side: 'player', status: 'freeze', delta: 1 })
  })

  it('Goldwing Monarch: when wounded steals all gold and heals 2 per coin', () => {
    const r = fight(hero('ironstone-greatsword', [], { baseHealth: 60, gold: 4 }), boss('goldwing-monarch'), { fatigueStartRound: 30 })
    const own = from(r.events, 'Goldwing Monarch')
    expect(own.find((e) => e.type === 'gold' && e.side === 'player')).toMatchObject({ delta: -4 })
    expect(own.find((e) => e.type === 'heal')).toMatchObject({ amount: 8 })
  })

  it('Mountain Troll: only strikes every other turn', () => {
    const r = fight(hero('wooden-stick', [], { baseHealth: 200 }), boss('mountain-troll'), { fatigueStartRound: 30 })
    const trollTurns = r.events.filter((e) => e.type === 'turnStart' && e.side === 'enemy').length
    expect(strikes(r.events, 'enemy').length).toBe(Math.ceil(trollTurns / 2))
  })

  it('Redwood Treant: +3 attack while the player has no armor', () => {
    const r = fight(hero('wooden-stick', [], { baseHealth: 60 }), boss('redwood-treant'))
    expect(strikes(r.events, 'enemy')[0]).toBe(6)
    const armored = fight(hero('wooden-stick', ['shield-of-the-hero'], { baseHealth: 60 }), boss('redwood-treant'))
    expect(strikes(armored.events, 'enemy')[0]).toBe(3)
  })

  it('Swiftstrike Stag: strikes 3 times per turn', () => {
    const r = fight(hero('wooden-stick', [], { baseHealth: 60 }), boss('swiftstrike-stag'))
    expect(strikes(beforeTurn(r.events, 'player', 1), 'enemy')).toHaveLength(3)
  })
})

describe('the Leshen finale', () => {
  it('Leshen is the week 3 boss and turns into the Woodland Abomination', () => {
    expect(BOSSES_BY_ID['leshen']).toMatchObject({ week: 3, next: 'woodland-abomination' })
    expect(BOSSES_BY_ID['woodland-abomination']).toMatchObject({ week: 3, hidden: true })
  })

  it('Woodland Abomination gains 1 attack every turn', () => {
    const r = fight(hero('wooden-stick', [], { baseHealth: 100 }), boss('woodland-abomination'), { fatigueStartRound: 50 })
    expect(strikes(r.events, 'enemy').slice(0, 3)).toEqual([1, 2, 3])
  })
})
