import { useEffect, useState } from 'react'
import type { BattleEvent, BattleResult, Side } from '../../core/combat/types'
import { PALETTE } from '../../render/palette'
import type { IconName } from '../icons'
import { PixelIcon } from '../PixelIcon'
import { Fighter, POPUP_MS } from './Fighter'
import { activePopups, SPEEDS, type Speed } from './playback'
import { StatusList } from './StatusList'
import { usePlayback } from './usePlayback'
import './combat.css'

export interface BattleView {
  readonly id: string
  readonly result: BattleResult
  readonly enemyName: string
  readonly enemyText: string
  readonly boss?: boolean
  readonly goldReward: number
}

const SPEED_KEY = 'hic.combatSpeed'
const SPEED_ICONS: Record<Speed, IconName> = { 1: 'play1', 2: 'play2', 3: 'play3' }

const loadSpeed = (): Speed => {
  try {
    const stored = Number(window.localStorage.getItem(SPEED_KEY))
    return (SPEEDS as readonly number[]).includes(stored) ? (stored as Speed) : 1
  } catch {
    return 1
  }
}

const saveSpeed = (speed: Speed) => {
  try {
    window.localStorage.setItem(SPEED_KEY, String(speed))
  } catch {
    // Storage unavailable (private mode): the choice just isn't remembered.
  }
}

/** Which fighter is animating on this event, if any. */
const actionOf = (event: BattleEvent | undefined, side: Side): 'lunge' | 'hit' | null => {
  if (event?.type === 'strike' && event.side === side) return 'lunge'
  if (event?.type === 'damage' && event.side === side && event.source === 'strike') return 'hit'
  return null
}

interface Props {
  readonly battle: BattleView
  readonly onFinish: () => void
}

/** Replays a simulated battle. Space pauses, 1–3 set speed, Ctrl/Enter skips, Enter continues once finished. */
export function CombatView({ battle, onFinish }: Props) {
  const [speed, setSpeed] = useState<Speed>(loadSpeed)
  const [paused, setPaused] = useState(false)
  const { events, winner } = battle.result
  const { index, event, done, skip } = usePlayback(events, speed, paused)
  const snapshot = (event ?? events[0])?.snapshot
  const popups = activePopups(events, index, speed, POPUP_MS)

  const chooseSpeed = (next: Speed) => {
    setSpeed(next)
    setPaused(false)
    saveSpeed(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        return onFinish()
      }
      if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      } else if (e.key === 'Control' || e.key === 'Enter') {
        skip()
      } else if (e.key === '1' || e.key === '2' || e.key === '3') {
        chooseSpeed(Number(e.key) as Speed)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, onFinish, skip])

  if (!snapshot) return null
  const names: Record<Side, string> = { player: 'Hero', enemy: battle.enemyName }
  const fighter = (side: Side) => (
    <Fighter
      side={side}
      name={names[side]}
      stats={snapshot[side]}
      popups={popups.filter((p) => p.popup.side === side)}
      action={actionOf(event, side)}
      actionKey={actionOf(event, side) ? `${side}-${index}` : side}
      dead={done && winner !== side}
      big={side === 'enemy' && battle.boss}
    />
  )

  return (
    <>
      <div className="combat-backdrop" aria-hidden="true" />
      <section className="panel combat-status-box combat-status-player" aria-label="Your statuses">
        <StatusList statuses={snapshot.player.statuses} label="Hero statuses" />
      </section>

      <main className="panel combat-stage" data-testid="combat">
        <div className="combat-gold frame-thin" style={{ color: PALETTE.gold }} aria-label={`Gold ${snapshot.player.gold}`}>
          <PixelIcon icon="coin" color={PALETTE.gold} />
          {snapshot.player.gold}
        </div>
        <div className="combat-controls" role="toolbar" aria-label="Battle speed">
          <button type="button" aria-label="Pause" aria-pressed={paused} className={paused ? 'is-on' : ''} onClick={() => setPaused((p) => !p)}>
            <PixelIcon icon="pause" color="currentColor" />
          </button>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`Speed ${s}`}
              aria-pressed={!paused && speed === s}
              className={!paused && speed === s ? 'is-on' : ''}
              onClick={() => chooseSpeed(s)}
            >
              <PixelIcon icon={SPEED_ICONS[s]} color="currentColor" />
            </button>
          ))}
          <button type="button" aria-label="Skip battle" onClick={skip} disabled={done}>
            <PixelIcon icon="skip" color="currentColor" />
          </button>
        </div>

        <div className="combat-arena">
          {fighter('player')}
          {fighter('enemy')}
        </div>

        {done && (
          <div className={`combat-result ${winner === 'player' ? 'is-win' : 'is-loss'}`} role="dialog" aria-label="Battle result">
            <div className="combat-result-title">{winner === 'player' ? 'Victory' : 'Defeat'}</div>
            {winner === 'player' && battle.goldReward > 0 && (
              <div className="combat-result-reward" style={{ color: PALETTE.gold }}>
                <PixelIcon icon="coin" color={PALETTE.gold} /> +{battle.goldReward}
              </div>
            )}
            <button type="button" className="combat-continue" onClick={onFinish} autoFocus>
              Continue
            </button>
          </div>
        )}
      </main>

      <aside className="panel combat-status-box combat-status-enemy" aria-label="Enemy statuses">
        <StatusList statuses={snapshot.enemy.statuses} label={`${battle.enemyName} statuses`} />
      </aside>
      <aside className="panel combat-info">
        <h2>{battle.enemyName}</h2>
        <p>{battle.enemyText}</p>
      </aside>
    </>
  )
}
