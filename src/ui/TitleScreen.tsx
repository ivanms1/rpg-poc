import type { RunState } from '../core/run/types'
import { timeOfWeek } from '../core/world/clock'
import { PALETTE } from '../render/palette'
import { PixelIcon } from './PixelIcon'

interface Props {
  readonly saved: RunState | null
  readonly saveError: string | null
  readonly onContinue: () => void
  readonly onNewRun: () => void
}

const CONTROLS: readonly [string, string][] = [
  ['WASD / arrows', 'walk the paths'],
  ['Tab', 'preview the boss'],
  ['1–6', 'pick an option'],
  ['Esc', 'close a dialog'],
  ['Space / 1–3 / Ctrl', 'pause, speed, skip battles'],
  ['C', 'toggle scanlines'],
]

export function TitleScreen({ saved, saveError, onContinue, onNewRun }: Props) {
  const savedTime = saved ? timeOfWeek(saved.step) : null
  return (
    <div className="title-screen" role="main">
      <PixelIcon icon="skull" color={PALETTE.enemy} scale={3} />
      <h1>He is Coming</h1>
      <p className="title-sub">Three weeks to prepare. Then he arrives.</p>
      <div className="title-actions">
        {saved && savedTime && (
          <button type="button" className="dialog-button" onClick={onContinue} autoFocus>
            Continue · week {saved.week}, {savedTime.phase} {savedTime.day}
          </button>
        )}
        <button type="button" className="dialog-button" onClick={onNewRun} autoFocus={!saved}>
          New run
        </button>
      </div>
      {saveError && (
        <p className="dialog-notice" role="alert">
          Your saved run couldn't be loaded ({saveError}). Starting a new run replaces it.
        </p>
      )}
      <dl className="title-controls">
        {CONTROLS.map(([key, what]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
