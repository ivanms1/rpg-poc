import type { BattleEvent, FighterVisible } from '../../core/combat/types'
import { EMPTY_STATUSES } from '../../core/combat/state'
import { BEAT_MS, BIG_HIT, activePopups, beatDuration, popupsFor, shakeOf } from './playback'

const fighter: FighterVisible = { hp: 10, maxHp: 10, attack: 1, armor: 0, speed: 0, gold: 0, statuses: EMPTY_STATUSES }
const snapshot = { player: fighter, enemy: fighter }
const ev = (body: Record<string, unknown>) => ({ ...body, snapshot }) as unknown as BattleEvent

describe('beatDuration', () => {
  it('scales with speed', () => {
    const strike = ev({ type: 'strike', side: 'player', damage: 2 })
    expect(beatDuration(strike, 1)).toBe(BEAT_MS.strike)
    expect(beatDuration(strike, 3)).toBe(BEAT_MS.strike / 3)
  })

  it('gives every event type a duration', () => {
    const types: BattleEvent['type'][] = [
      'battleStart', 'turnStart', 'trigger', 'strike', 'stunned', 'damage', 'heal', 'stat', 'status', 'gold', 'exposed', 'wounded', 'death', 'battleEnd',
    ]
    for (const type of types) expect(BEAT_MS[type]).toBeGreaterThanOrEqual(0)
  })

  it('rejects non-positive speeds', () => {
    expect(() => beatDuration(ev({ type: 'strike', side: 'player', damage: 1 }), 0)).toThrow(RangeError)
  })
})

describe('popupsFor', () => {
  it('splits damage into armor and health popups', () => {
    expect(popupsFor(ev({ type: 'damage', side: 'enemy', amount: 5, armorLost: 2, hpLost: 3, source: 'strike' }))).toEqual([
      { side: 'enemy', icon: 'shield', value: -2, tone: 'armor' },
      { side: 'enemy', icon: 'heart', value: -3, tone: 'health' },
    ])
  })

  it('shows heals, stat and status changes and gold', () => {
    expect(popupsFor(ev({ type: 'heal', side: 'player', amount: 2, source: 'x' }))).toEqual([{ side: 'player', icon: 'heart', value: 2, tone: 'health' }])
    expect(popupsFor(ev({ type: 'stat', side: 'player', stat: 'attack', delta: -1, source: 'x' }))).toEqual([{ side: 'player', icon: 'sword', value: -1, tone: 'attack' }])
    expect(popupsFor(ev({ type: 'stat', side: 'player', stat: 'maxHp', delta: 4, source: 'x' }))).toEqual([{ side: 'player', icon: 'heart', value: 4, tone: 'health' }])
    expect(popupsFor(ev({ type: 'status', side: 'enemy', status: 'poison', delta: 3, source: 'x' }))).toEqual([{ side: 'enemy', icon: 'poison', value: 3, tone: 'poison' }])
    expect(popupsFor(ev({ type: 'gold', side: 'player', delta: -2, source: 'Raven' }))).toEqual([{ side: 'player', icon: 'coin', value: -2, tone: 'gold' }])
  })

  it('labels Exposed, Wounded and stun', () => {
    expect(popupsFor(ev({ type: 'exposed', side: 'player' }))).toEqual([{ side: 'player', label: 'Exposed', tone: 'armor' }])
    expect(popupsFor(ev({ type: 'wounded', side: 'enemy' }))).toEqual([{ side: 'enemy', label: 'Wounded', tone: 'attack' }])
    expect(popupsFor(ev({ type: 'stunned', side: 'enemy' }))).toEqual([{ side: 'enemy', label: 'Stunned', tone: 'stun' }])
  })

  it('has no popup for structural events', () => {
    expect(popupsFor(ev({ type: 'turnStart', side: 'player', turn: 1 }))).toEqual([])
    expect(popupsFor(ev({ type: 'battleEnd', winner: 'player', turns: 3 }))).toEqual([])
  })
})

describe('activePopups', () => {
  const events = [
    ev({ type: 'strike', side: 'player', damage: 2 }),
    ev({ type: 'damage', side: 'enemy', amount: 2, armorLost: 0, hpLost: 2, source: 'strike' }),
    ev({ type: 'turnStart', side: 'enemy', turn: 1 }),
    ev({ type: 'heal', side: 'enemy', amount: 1, source: 'x' }),
  ]

  it('includes recent popups oldest first, with their age', () => {
    const active = activePopups(events, 3, 1, 10_000)
    expect(active.map((a) => a.key)).toEqual(['1-0', '3-0'])
    expect(active[0]?.age).toBe(BEAT_MS.damage + BEAT_MS.turnStart)
    expect(active[1]?.age).toBe(0)
  })

  it('drops popups older than the window', () => {
    expect(activePopups(events, 3, 1, BEAT_MS.turnStart + 1).map((a) => a.key)).toEqual(['3-0'])
  })

  it('ages faster at higher speed', () => {
    expect(activePopups(events, 3, 3, 10_000)[0]?.age).toBeCloseTo((BEAT_MS.damage + BEAT_MS.turnStart) / 3)
  })

  it('tolerates an index past the end', () => {
    expect(activePopups(events, 99, 1, 10_000)).toHaveLength(2)
  })
})

describe('shakeOf', () => {
  const damage = (hpLost: number) => ev({ type: 'damage', side: 'enemy', amount: hpLost, armorLost: 0, hpLost, source: 'strike' })

  it('shakes more for heavy hits and deaths', () => {
    expect(shakeOf(damage(1))).toBe('small')
    expect(shakeOf(damage(BIG_HIT))).toBe('big')
    expect(shakeOf(ev({ type: 'death', side: 'enemy' }))).toBe('big')
  })

  it('stays still for blocked hits and other events', () => {
    expect(shakeOf(damage(0))).toBeNull()
    expect(shakeOf(ev({ type: 'strike', side: 'player', damage: 1 }))).toBeNull()
    expect(shakeOf(undefined)).toBeNull()
  })
})
