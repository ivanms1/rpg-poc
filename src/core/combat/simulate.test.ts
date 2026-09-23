import { addStatus, gainStat } from './ops'
import { simulateBattle } from './simulate'
import { combatant, damageTo, eventsOf, source, stats } from './testkit'
import type { BattleEvent, Hook, Side } from './types'

const strikesBy = (events: readonly BattleEvent[], side: Side) => eventsOf(events, 'strike').filter((e) => e.side === side)
const battleStart = (fn: Hook) => source('Setup', { hooks: { battleStart: fn } })

describe('simulateBattle — turn order', () => {
  it('lets the faster fighter strike first', () => {
    const r = simulateBattle(combatant('Hero', stats(10, 1, 0, 1)), combatant('Wolf', stats(10, 1, 0, 3)))
    expect(eventsOf(r.events, 'strike')[0]?.side).toBe('enemy')
  })

  it('gives the player the first turn on a speed tie', () => {
    const r = simulateBattle(combatant('Hero', stats(10, 1, 0, 2)), combatant('Wolf', stats(10, 1, 0, 2)))
    expect(eventsOf(r.events, 'strike')[0]?.side).toBe('player')
  })

  it('compares speed after Battle Start effects', () => {
    const boots = battleStart((s, ctx) => gainStat(s, ctx.self, 'speed', 5, 'boots'))
    const r = simulateBattle(combatant('Hero', stats(10, 1, 0, 0), [boots]), combatant('Wolf', stats(10, 1, 0, 3)))
    expect(eventsOf(r.events, 'strike')[0]?.side).toBe('player')
  })

  it('alternates turns and ends when someone dies', () => {
    const r = simulateBattle(combatant('Hero', stats(10, 3)), combatant('Rat', stats(5, 1)))
    expect(r.winner).toBe('player')
    expect(strikesBy(r.events, 'player')).toHaveLength(2)
    expect(strikesBy(r.events, 'enemy')).toHaveLength(1)
    expect(r.final.player.hp).toBe(9)
    expect(r.events.at(-1)).toMatchObject({ type: 'battleEnd', winner: 'player' })
  })

  it('counts rounds, not individual turns', () => {
    const r = simulateBattle(combatant('Hero', stats(10, 3)), combatant('Rat', stats(5, 1)))
    expect(r.rounds).toBe(2)
    expect(eventsOf(r.events, 'turnStart').map((e) => [e.side, e.turn])).toEqual([
      ['player', 1], ['enemy', 1], ['player', 2],
    ])
  })

  it('carries current health into the fight', () => {
    const r = simulateBattle(combatant('Hero', stats(10, 1), [], { hp: 1 }), combatant('Rat', stats(5, 1)))
    expect(r.winner).toBe('enemy')
  })
})

describe('simulateBattle — strikes', () => {
  it('fires On Hit with the damage dealt, before thorns retaliate', () => {
    const order: string[] = []
    const spear = source('Spear', { kind: 'weapon', hooks: { onHit: (s, ctx) => (order.push(`hit:${ctx.payload.amount}`), s) } })
    const spiky = battleStart((s, ctx) => addStatus(s, ctx.self, 'thorns', 2, 'spikes'))
    const r = simulateBattle(combatant('Hero', stats(10, 3), [spear]), combatant('Hedgehog', stats(5, 0, 0, 0), [spiky]))
    expect(order[0]).toBe('hit:3')
    const firstStrike = r.events.findIndex((e) => e.type === 'strike')
    const thorns = damageTo(r.events, 'player')[0]
    expect(thorns).toMatchObject({ amount: 2, source: 'Hedgehog thorns' })
    expect(r.events.indexOf(thorns as BattleEvent)).toBeGreaterThan(firstStrike)
  })

  it('floors strike damage at 0 for negative attack', () => {
    const r = simulateBattle(combatant('Hero', stats(10, -2)), combatant('Rat', stats(2, 1)))
    expect(strikesBy(r.events, 'player')[0]?.damage).toBe(0)
  })

  it('adds attack bonuses and strike bonuses', () => {
    const rage = source('Rage', { kind: 'trait', attackBonus: () => 2, strikeBonus: (_s, _self, i) => (i === 1 ? 10 : 0) })
    const r = simulateBattle(combatant('Hero', stats(50, 0)), combatant('Hog', stats(5, 1, 0, 1), [rage]))
    expect(strikesBy(r.events, 'enemy').map((e) => e.damage).slice(0, 2)).toEqual([13, 3])
  })

  it('can ignore armor', () => {
    const claws = source('Claws', { kind: 'trait', ignoreArmor: true })
    const r = simulateBattle(combatant('Hero', stats(10, 0, 5)), combatant('Grizzly', stats(3, 3, 0, 1), [claws]), { fatigueStartRound: 2 })
    expect(damageTo(r.events, 'player')[0]).toMatchObject({ armorLost: 0, hpLost: 3 })
  })

  it('strikes several times per turn', () => {
    const stag = source('Stag', { kind: 'trait', strikesPerTurn: 3 })
    const r = simulateBattle(combatant('Hero', stats(10, 0, 0, 0)), combatant('Stag', stats(3, 1, 0, 5), [stag]), { fatigueStartRound: 3 })
    const firstTurn = r.events.slice(0, r.events.findIndex((e) => e.type === 'turnStart' && e.side === 'player'))
    expect(strikesBy(firstTurn, 'enemy')).toHaveLength(3)
  })

  it('spends queued additional strikes on the next strike phase only', () => {
    const belt = battleStart((s, ctx) => ({ ...s, fighters: { ...s.fighters, [ctx.self]: { ...s.fighters[ctx.self], extraStrikes: 1 } } }))
    const r = simulateBattle(combatant('Hero', stats(10, 1), [belt]), combatant('Tank', stats(5, 0)))
    const turns = r.events.reduce<number[]>((acc, e) => {
      if (e.type === 'turnStart' && e.side === 'player') acc.push(0)
      if (e.type === 'strike' && e.side === 'player') acc[acc.length - 1] = (acc.at(-1) ?? 0) + 1
      return acc
    }, [])
    expect(turns.slice(0, 2)).toEqual([2, 1])
  })

  it('respects canStrike', () => {
    const idle = source('Idle', { kind: 'trait', canStrike: () => false })
    const r = simulateBattle(combatant('Hero', stats(10, 1)), combatant('King', stats(3, 5), [idle]))
    expect(strikesBy(r.events, 'enemy')).toHaveLength(0)
    expect(r.winner).toBe('player')
  })
})

describe('simulateBattle — statuses', () => {
  const withStatus = (status: Parameters<typeof addStatus>[2], n: number, target: 'self' | 'enemy' = 'self') =>
    battleStart((s, ctx) => addStatus(s, target === 'self' ? ctx.self : ctx.self === 'player' ? 'enemy' : 'player', status, n, 'setup'))

  it('stun skips the strike but not Turn Start triggers', () => {
    let turnStarts = 0
    const counter = source('Counter', { hooks: { turnStart: (s) => (turnStarts++, s) } })
    const r = simulateBattle(
      combatant('Hero', stats(10, 1, 0, 1), [counter, withStatus('stun', 1)]),
      combatant('Rat', stats(2, 0)),
    )
    expect(eventsOf(r.events, 'stunned')[0]?.side).toBe('player')
    expect(strikesBy(r.events, 'player')).toHaveLength(2)
    expect(turnStarts).toBe(3)
  })

  it('each additional strike consumes a stun', () => {
    const setup = battleStart((s, ctx) => {
      const next = addStatus(s, ctx.self, 'stun', 2, 'setup')
      return { ...next, fighters: { ...next.fighters, player: { ...next.fighters.player, extraStrikes: 2 } } }
    })
    const r = simulateBattle(combatant('Hero', stats(10, 1, 0, 1), [setup]), combatant('Rat', stats(5, 0)))
    const firstTurnEnd = r.events.findIndex((e) => e.type === 'turnStart' && e.side === 'enemy')
    const first = r.events.slice(0, firstTurnEnd)
    expect(eventsOf(first, 'stunned')).toHaveLength(2)
    expect(strikesBy(first, 'player')).toHaveLength(1)
  })

  it('poison hurts only with 0 armor and decays every turn', () => {
    const r = simulateBattle(combatant('Hero', stats(30, 0, 1), [withStatus('poison', 3)]), combatant('Rat', stats(1, 1)), { fatigueStartRound: 4 })
    const poison = damageTo(r.events, 'player').filter((e) => e.source === 'poison')
    expect(poison.map((e) => e.amount)).toEqual([2, 1])
  })

  it('acid strips armor each turn without decaying', () => {
    const r = simulateBattle(combatant('Hero', stats(30, 0, 5), [withStatus('acid', 2)]), combatant('Rat', stats(50, 0)), { fatigueStartRound: 4 })
    const acid = eventsOf(r.events, 'stat').filter((e) => e.source === 'acid' && e.side === 'player')
    expect(acid.map((e) => e.delta)).toEqual([-2, -2, -1])
    expect(r.final.player.statuses.acid).toBe(2)
  })

  it('regeneration heals at turn end then decays', () => {
    const hurt = battleStart((s, ctx) => addStatus({ ...s, fighters: { ...s.fighters, [ctx.self]: { ...s.fighters[ctx.self], hp: 5 } } }, ctx.self, 'regen', 2, 'setup'))
    const r = simulateBattle(combatant('Hero', stats(10, 0), [hurt]), combatant('Rat', stats(50, 0)), { fatigueStartRound: 3 })
    const heals = eventsOf(r.events, 'heal').filter((e) => e.source === 'regeneration')
    expect(heals.map((e) => e.amount)).toEqual([2, 1])
  })

  it('riptide deals 5 once per turn and loses a stack', () => {
    const r = simulateBattle(combatant('Hero', stats(30, 0, 2), [withStatus('riptide', 2)]), combatant('Rat', stats(50, 0)), { fatigueStartRound: 4 })
    const riptide = damageTo(r.events, 'player').filter((e) => e.source === 'riptide')
    expect(riptide.map((e) => [e.armorLost, e.hpLost])).toEqual([[2, 3], [0, 5]])
  })

  it('freeze halves attack (rounded down) and thaws one stack per turn', () => {
    const r = simulateBattle(combatant('Hero', stats(30, 5), [withStatus('freeze', 1)]), combatant('Rat', stats(50, 0)), { fatigueStartRound: 3 })
    expect(strikesBy(r.events, 'player').map((e) => e.damage).slice(0, 2)).toEqual([2, 5])
  })

  it('thorns fire on every strike and are removed at the end of that turn', () => {
    const stag = source('Stag', { kind: 'trait', strikesPerTurn: 2 })
    const r = simulateBattle(
      combatant('Hero', stats(30, 0, 0, 0), [withStatus('thorns', 3)]),
      combatant('Stag', stats(30, 1, 0, 5), [stag]),
      { fatigueStartRound: 3 },
    )
    expect(damageTo(r.events, 'enemy').filter((e) => e.source === 'Hero thorns')).toHaveLength(2)
    const firstEnemyTurnEnd = r.events.findIndex((e) => e.type === 'turnStart' && e.side === 'player')
    expect(r.events[firstEnemyTurnEnd - 1]?.snapshot.player.statuses.thorns).toBe(0)
  })

  it('thorns stay if the attacker skips its strike', () => {
    const r = simulateBattle(
      combatant('Hero', stats(30, 0, 0, 0), [withStatus('thorns', 3), withStatus('stun', 1, 'enemy')]),
      combatant('Rat', stats(30, 1, 0, 5)),
      { fatigueStartRound: 3 },
    )
    const firstPlayerTurn = r.events.find((e) => e.type === 'turnStart' && e.side === 'player')
    expect(firstPlayerTurn?.snapshot.player.statuses.thorns).toBe(3)
  })
})

describe('simulateBattle — termination', () => {
  it('applies escalating fatigue so stalemates end', () => {
    const r = simulateBattle(combatant('Hero', stats(10, 0)), combatant('Wall', stats(10, 0)), { fatigueStartRound: 3 })
    const fatigue = damageTo(r.events, 'player').filter((e) => e.source === 'fatigue')
    expect(fatigue.map((e) => e.amount)).toEqual([1, 2, 3, 4])
    expect(r.winner).toBe('enemy')
  })

  it('has a hard round cap that the player loses', () => {
    const r = simulateBattle(combatant('Hero', stats(10, 0)), combatant('Wall', stats(10, 0)), { fatigueStartRound: 10_000, maxRounds: 5 })
    expect(r.winner).toBe('enemy')
    expect(r.rounds).toBe(5)
  })
})

describe('simulateBattle — strike extensions', () => {
  it('doubleOnHit runs On Hit effects twice', () => {
    let hits = 0
    const spear = source('Spear', { kind: 'weapon', hooks: { onHit: (s) => (hits++, s) } })
    const medallion = source('Chainlink Medallion', { doubleOnHit: true })
    simulateBattle(combatant('Hero', stats(10, 5), [spear, medallion]), combatant('Rat', stats(6, 0)))
    expect(hits).toBe(2)
  })

  it('onStruck reports the damage and armor a strike removed, after thorns', () => {
    const seen: string[] = []
    const watcher = source('Watcher', { hooks: { onStruck: (s, ctx) => (seen.push(`${ctx.payload.amount}/${ctx.payload.armorLost}`), s) } })
    simulateBattle(combatant('Hero', stats(30, 0, 2, 0), [watcher]), combatant('Rat', stats(5, 3, 0, 5)), { fatigueStartRound: 3 })
    expect(seen[0]).toBe('3/2')
  })

  it('keepThornsForStrikes spares thorns on the enemy’s first strikes', () => {
    const granite = source('Granite Thorns', { keepThornsForStrikes: 1 })
    const spikes = battleStart((s, ctx) => addStatus(s, ctx.self, 'thorns', 2, 'setup'))
    const r = simulateBattle(combatant('Hero', stats(30, 0, 0, 0), [granite, spikes]), combatant('Rat', stats(30, 1, 0, 5)), { fatigueStartRound: 4 })
    const thornHits = damageTo(r.events, 'enemy').filter((e) => e.source === 'Hero thorns')
    expect(thornHits).toHaveLength(2)
  })

  it('freezeDoubles makes freeze double attack', () => {
    const cold = source('Cold Resistance', { freezeDoubles: true })
    const frozen = battleStart((s, ctx) => addStatus(s, ctx.self, 'freeze', 1, 'setup'))
    const r = simulateBattle(combatant('Hero', stats(30, 3), [cold, frozen]), combatant('Rat', stats(50, 0)))
    expect(strikesBy(r.events, 'player')[0]?.damage).toBe(6)
  })

  it('strike damage is attributed to the attacker for outgoing modifiers', () => {
    const heavy = source('Heavy', { outgoingDamage: (_s, _self, amount, kind) => (kind === 'strike' ? amount * 2 : amount) })
    const r = simulateBattle(combatant('Hero', stats(30, 3), [heavy]), combatant('Rat', stats(50, 0)))
    expect(damageTo(r.events, 'enemy')[0]).toMatchObject({ amount: 6 })
  })
})
