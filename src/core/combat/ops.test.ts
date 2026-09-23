import { addStatus, dealDamage, gainGold, gainStat, heal, loseArmor, loseHealth, removeStatus, stealGold } from './ops'
import { battle, combatant, eventsOf, source, stats } from './testkit'

const hero = (hp = 10, armor = 0, sources = [source('Noop', {})]) => combatant('Hero', stats(hp, 1, armor, 0), sources)
const dummy = combatant('Dummy', stats(10, 1, 0, 0))

describe('dealDamage', () => {
  it('hits armor first, then health', () => {
    const s = dealDamage(battle(hero(10, 3), dummy), 'player', 5, 'test')
    expect(s.fighters.player).toMatchObject({ armor: 0, hp: 8 })
    expect(eventsOf(s.events, 'damage')[0]).toMatchObject({ side: 'player', amount: 5, armorLost: 3, hpLost: 2 })
  })

  it('ignores zero or negative damage', () => {
    const start = battle(hero(), dummy)
    expect(dealDamage(start, 'player', 0, 'test')).toBe(start)
    expect(dealDamage(start, 'player', -2, 'test')).toBe(start)
  })

  it('can ignore armor', () => {
    const s = dealDamage(battle(hero(10, 5), dummy), 'player', 3, 'test', { ignoreArmor: true })
    expect(s.fighters.player).toMatchObject({ armor: 5, hp: 7 })
  })

  it('applies incoming-damage modifiers', () => {
    const brittle = source('Brittle', { incomingDamage: (_s, _self, amount) => amount + 3 })
    const s = dealDamage(battle(hero(10, 0, [brittle]), dummy), 'player', 1, 'test')
    expect(s.fighters.player.hp).toBe(6)
  })

  it('fires Exposed once when armor first reaches 0', () => {
    const plated = source('Plated', { hooks: { exposed: (s, ctx) => gainStat(s, ctx.self, 'armor', 3, ctx.source.name) } })
    let s = battle(hero(20, 2, [plated]), dummy)
    s = dealDamage(s, 'player', 2, 'hit')
    expect(eventsOf(s.events, 'exposed')).toHaveLength(1)
    expect(s.fighters.player.armor).toBe(3)
    s = dealDamage(s, 'player', 3, 'hit')
    expect(eventsOf(s.events, 'exposed')).toHaveLength(1)
    expect(s.fighters.player.armor).toBe(0)
  })

  it('does not fire Exposed for a fighter that starts with 0 armor', () => {
    const s = dealDamage(battle(hero(10, 0), dummy), 'player', 2, 'hit')
    expect(eventsOf(s.events, 'exposed')).toHaveLength(0)
  })

  it('fires Wounded once at 50% health or less', () => {
    let s = battle(hero(10), dummy)
    s = dealDamage(s, 'player', 4, 'hit')
    expect(s.fighters.player.wounded).toBe(false)
    s = dealDamage(s, 'player', 1, 'hit')
    expect(s.fighters.player.wounded).toBe(true)
    s = dealDamage(s, 'player', 1, 'hit')
    expect(eventsOf(s.events, 'wounded')).toHaveLength(1)
  })

  it('tells the opponent when a fighter becomes wounded', () => {
    const chain = source('Blood Chain', { hooks: { enemyWounded: (s, ctx) => gainStat(s, ctx.self, 'attack', 1, ctx.source.name) } })
    const s = dealDamage(battle(hero(10, 0, [chain]), dummy), 'enemy', 6, 'hit')
    expect(s.fighters.player.attack).toBe(2)
  })

  it('ends the battle on death and ignores everything after', () => {
    let s = dealDamage(battle(hero(10), dummy), 'enemy', 10, 'hit')
    expect(s.winner).toBe('player')
    expect(eventsOf(s.events, 'death')).toEqual([expect.objectContaining({ side: 'enemy' })])
    const after = dealDamage(s, 'player', 5, 'late')
    expect(after).toBe(s)
    s = heal(s, 'enemy', 5, 'late')
    expect(s.fighters.enemy.hp).toBe(0)
  })

  it('a lethal hit ends the battle before the victim’s Exposed effects can fire', () => {
    const surprise = source('Explosive Surprise', { hooks: { exposed: (s, ctx) => dealDamage(s, 'enemy', 6, ctx.source.name) } })
    const s = dealDamage(battle(hero(10, 2, [surprise]), combatant('Attacker', stats(6, 5))), 'player', 12, 'strike')
    expect(s.winner).toBe('enemy')
    expect(s.fighters.enemy.hp).toBe(6)
    expect(eventsOf(s.events, 'death')).toEqual([expect.objectContaining({ side: 'player' })])
  })

  it('triggers onDamaged with the amount taken', () => {
    const armor = source('Blackbriar Armor', { hooks: { onDamaged: (s, ctx) => addStatus(s, ctx.self, 'thorns', 2, ctx.source.name) } })
    const s = dealDamage(battle(hero(10, 0, [armor]), dummy), 'player', 1, 'hit')
    expect(s.fighters.player.statuses.thorns).toBe(2)
  })

  it('does not mutate the input state', () => {
    const start = battle(hero(10, 2), dummy)
    dealDamage(start, 'player', 5, 'hit')
    expect(start.fighters.player).toMatchObject({ hp: 10, armor: 2 })
    expect(start.events).toHaveLength(0)
  })
})

describe('loseHealth', () => {
  it('bypasses armor', () => {
    const s = loseHealth(battle(hero(10, 5), dummy), 'player', 3, 'self')
    expect(s.fighters.player).toMatchObject({ hp: 7, armor: 5 })
  })

  it('can kill', () => {
    expect(loseHealth(battle(hero(3), dummy), 'player', 3, 'self').winner).toBe('enemy')
  })
})

describe('heal', () => {
  it('restores up to max health and fires onHeal', () => {
    const rose = source('Iron Rose', { hooks: { onHeal: (s, ctx) => gainStat(s, ctx.self, 'armor', 1, ctx.source.name) } })
    const s = heal(loseHealth(battle(hero(10, 0, [rose]), dummy), 'player', 2, 'x'), 'player', 5, 'potion')
    expect(s.fighters.player.hp).toBe(10)
    expect(eventsOf(s.events, 'heal')[0]).toMatchObject({ amount: 2 })
    expect(s.fighters.player.armor).toBe(1)
  })

  it('does nothing at full health', () => {
    const start = battle(hero(), dummy)
    expect(heal(start, 'player', 3, 'potion')).toBe(start)
  })
})

describe('gainStat', () => {
  it('changes attack and speed, including below zero', () => {
    let s = gainStat(battle(hero(), dummy), 'player', 'attack', 2, 'x')
    s = gainStat(s, 'player', 'speed', -3, 'x')
    expect(s.fighters.player).toMatchObject({ attack: 3, speed: -3 })
  })

  it('floors armor at 0 and can expose', () => {
    const s = gainStat(battle(hero(10, 2), dummy), 'player', 'armor', -5, 'x')
    expect(s.fighters.player.armor).toBe(0)
    expect(eventsOf(s.events, 'exposed')).toHaveLength(1)
  })

  it('raises current health along with max health', () => {
    const s = gainStat(battle(hero(10), dummy), 'player', 'maxHp', 4, 'crown')
    expect(s.fighters.player).toMatchObject({ maxHp: 14, hp: 14 })
  })

  it('ignores a zero change', () => {
    const start = battle(hero(), dummy)
    expect(gainStat(start, 'player', 'attack', 0, 'x')).toBe(start)
  })
})

describe('loseArmor', () => {
  it('removes armor without counting as damage', () => {
    const armor = source('Blackbriar Armor', { hooks: { onDamaged: (s, ctx) => addStatus(s, ctx.self, 'thorns', 2, ctx.source.name) } })
    const s = loseArmor(battle(hero(10, 3, [armor]), dummy), 'player', 2, 'acid')
    expect(s.fighters.player.armor).toBe(1)
    expect(s.fighters.player.statuses.thorns).toBe(0)
  })
})

describe('statuses', () => {
  it('adds and removes stacks, never below 0', () => {
    let s = addStatus(battle(hero(), dummy), 'player', 'poison', 3, 'snake')
    s = removeStatus(s, 'player', 'poison', 5, 'tick')
    expect(s.fighters.player.statuses.poison).toBe(0)
    expect(eventsOf(s.events, 'status').map((e) => e.delta)).toEqual([3, -3])
  })

  it('fires onGainThorns', () => {
    const talisman = source('Bramble Talisman', { hooks: { onGainThorns: (s, ctx) => gainStat(s, ctx.self, 'armor', 1, ctx.source.name) } })
    const s = addStatus(battle(hero(10, 0, [talisman]), dummy), 'player', 'thorns', 2, 'x')
    expect(s.fighters.player.armor).toBe(1)
  })

  it('removing purity grants +1 attack and heals per stack', () => {
    let s = loseHealth(battle(hero(20), dummy), 'player', 10, 'x')
    s = addStatus(s, 'player', 'purity', 4, 'spirit')
    s = removeStatus(s, 'player', 'purity', 2, 'spirit')
    expect(s.fighters.player).toMatchObject({ attack: 3, hp: 16 })
    expect(s.fighters.player.statuses.purity).toBe(2)
  })

  it('ignores empty changes', () => {
    const start = battle(hero(), dummy)
    expect(addStatus(start, 'player', 'stun', 0, 'x')).toBe(start)
    expect(removeStatus(start, 'player', 'stun', 1, 'x')).toBe(start)
  })
})

describe('gold', () => {
  it('never drops below 0', () => {
    const s = gainGold(battle(combatant('Hero', stats(10), [], { gold: 2 }), dummy), 'player', -5, 'raven')
    expect(s.fighters.player.gold).toBe(0)
  })

  it('steals up to what the victim has', () => {
    const s = stealGold(battle(combatant('Hero', stats(10), [], { gold: 2 }), dummy), 'enemy', 3, 'Raven')
    expect(s.fighters.player.gold).toBe(0)
    expect(s.fighters.enemy.gold).toBe(2)
  })
})
