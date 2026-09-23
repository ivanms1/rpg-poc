/** Pure helpers for replaying a battle's event log: per-event pacing and floating popups. */
import type { BattleEvent, Side, StatName, StatusName } from '../../core/combat/types'
import type { IconName } from '../icons'

/** Milliseconds each event holds the screen at 1× speed. */
export const BEAT_MS: Record<BattleEvent['type'], number> = {
  battleStart: 500,
  turnStart: 250,
  trigger: 300,
  strike: 350,
  stunned: 450,
  damage: 300,
  heal: 250,
  stat: 200,
  status: 200,
  gold: 250,
  exposed: 350,
  wounded: 350,
  death: 900,
  battleEnd: 0,
}

export const SPEEDS = [1, 2, 3] as const
export type Speed = (typeof SPEEDS)[number]

export const beatDuration = (event: BattleEvent, speed: number): number => {
  if (speed <= 0) throw new RangeError(`beatDuration: speed must be positive, got ${speed}`)
  return BEAT_MS[event.type] / speed
}

export type Tone = 'health' | 'attack' | 'armor' | 'speed' | 'gold' | 'stun' | StatusName

export type Popup =
  | { readonly side: Side; readonly icon: IconName; readonly value: number; readonly tone: Tone }
  | { readonly side: Side; readonly label: string; readonly tone: Tone }

const STAT_POPUP: Record<StatName, { icon: IconName; tone: Tone }> = {
  attack: { icon: 'sword', tone: 'attack' },
  armor: { icon: 'shield', tone: 'armor' },
  speed: { icon: 'boots', tone: 'speed' },
  maxHp: { icon: 'heart', tone: 'health' },
}

export const popupsFor = (e: BattleEvent): readonly Popup[] => {
  switch (e.type) {
    case 'damage':
      return [
        ...(e.armorLost > 0 ? [{ side: e.side, icon: 'shield' as const, value: -e.armorLost, tone: 'armor' as const }] : []),
        ...(e.hpLost > 0 ? [{ side: e.side, icon: 'heart' as const, value: -e.hpLost, tone: 'health' as const }] : []),
      ]
    case 'heal':
      return [{ side: e.side, icon: 'heart', value: e.amount, tone: 'health' }]
    case 'stat':
      return [{ side: e.side, ...STAT_POPUP[e.stat], value: e.delta }]
    case 'status':
      return [{ side: e.side, icon: e.status, value: e.delta, tone: e.status }]
    case 'gold':
      return [{ side: e.side, icon: 'coin', value: e.delta, tone: 'gold' }]
    case 'exposed':
      return [{ side: e.side, label: 'Exposed', tone: 'armor' }]
    case 'wounded':
      return [{ side: e.side, label: 'Wounded', tone: 'attack' }]
    case 'stunned':
      return [{ side: e.side, label: 'Stunned', tone: 'stun' }]
    default:
      return []
  }
}

export interface ActivePopup {
  /** Stable React key: event index + position within that event. */
  readonly key: string
  readonly popup: Popup
  /** Playback time since the popup's event started, in ms. */
  readonly age: number
}

/** Popups whose events started within the last `windowMs` of playback before `index` (inclusive). */
export const activePopups = (events: readonly BattleEvent[], index: number, speed: number, windowMs: number): readonly ActivePopup[] => {
  const active: ActivePopup[] = []
  let age = 0
  for (let j = Math.min(index, events.length - 1); j >= 0 && age < windowMs; j--) {
    const event = events[j] as BattleEvent
    popupsFor(event).forEach((popup, k) => active.push({ key: `${j}-${k}`, popup, age }))
    if (j > 0) age += beatDuration(events[j - 1] as BattleEvent, speed)
  }
  return active.reverse()
}
