import { simulateBattle } from '../../core/combat/simulate'
import { formatEvent } from './formatEvent'
import { buildPlayer } from '../../core/items/loadout'
import { WEAPONS_BY_ID } from '../../data/weapons'
import { ITEMS_BY_ID } from '../../data/items'

const names = { player: 'Hero', enemy: 'Wolf' }

describe('formatEvent', () => {
  const r = simulateBattle(
    buildPlayer({ weapon: { item: WEAPONS_BY_ID['razorthorn-spear']! }, items: [{ item: ITEMS_BY_ID['horned-helmet']! }] }),
    { name: 'Wolf', stats: { maxHp: 6, attack: 2, armor: 1, speed: 0 }, sources: [] },
  )
  const lines = r.events.map((e) => formatEvent(e, names)).filter((l): l is string => l !== null)

  it('describes the whole battle in plain lines', () => {
    expect(lines[0]).toBe('Battle starts')
    expect(lines).toContain('Horned Helmet (Battle Start)')
    expect(lines).toContain('Hero gains 1 thorns — Horned Helmet')
    expect(lines).toContain('Hero strikes for 1')
    expect(lines).toContain('Wolf takes 1 (1 armor) — strike')
    expect(lines.at(-1)).toMatch(/^Hero wins after \d+ rounds?$/)
  })

  it('labels turns by round', () => {
    expect(lines).toContain('— Round 1: Hero —')
  })

  it('formats the remaining event types', () => {
    const snapshot = r.events[0]!.snapshot
    expect(formatEvent({ type: 'stunned', side: 'enemy', snapshot }, names)).toBe('Wolf is stunned and skips a strike')
    expect(formatEvent({ type: 'heal', side: 'player', amount: 2, source: 'regeneration', snapshot }, names)).toBe('Hero restores 2 — regeneration')
    expect(formatEvent({ type: 'stat', side: 'enemy', stat: 'attack', delta: -3, source: 'x', snapshot }, names)).toBe('Wolf loses 3 attack — x')
    expect(formatEvent({ type: 'gold', side: 'player', delta: 1, source: 'Gold Ring', snapshot }, names)).toBe('Hero gains 1 gold — Gold Ring')
    expect(formatEvent({ type: 'exposed', side: 'player', snapshot }, names)).toBe('Hero is Exposed')
    expect(formatEvent({ type: 'wounded', side: 'player', snapshot }, names)).toBe('Hero is Wounded')
    expect(formatEvent({ type: 'death', side: 'enemy', snapshot }, names)).toBe('Wolf dies')
    expect(formatEvent({ type: 'damage', side: 'enemy', amount: 3, armorLost: 0, hpLost: 3, source: 'poison', snapshot }, names)).toBe('Wolf takes 3 — poison')
    expect(formatEvent({ type: 'status', side: 'enemy', status: 'poison', delta: -1, source: 'poison', snapshot }, names)).toBe('Wolf loses 1 poison — poison')
  })
})
