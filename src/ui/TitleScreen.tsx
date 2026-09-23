import { DIFFICULTIES, DIFFICULTY_IDS, timeOf, type Difficulty } from '../core/run/difficulty'
import type { RunState } from '../core/run/types'
import { PALETTE } from '../render/palette'
import { PixelIcon } from './PixelIcon'

interface Props {
  readonly saved: RunState | null
  readonly saveError: string | null
  readonly difficulty: Difficulty
  readonly onDifficulty: (difficulty: Difficulty) => void
  readonly onContinue: () => void
  readonly onNewRun: () => void
}

const CONTROLS: readonly [string, string][] = [
  ['WASD / click', 'walk the paths'],
  ['Shift', 'see the whole map'],
  ['Tab', 'preview the boss'],
  ['1–6', 'pick an option'],
  ['Esc', 'close a dialog'],
  ['Space / 1–3 / Ctrl', 'pause, speed, skip battles'],
  ['M', 'mute sound'],
  ['C', 'toggle scanlines'],
]

export function TitleScreen({ saved, saveError, difficulty, onDifficulty, onContinue, onNewRun }: Props) {
  const savedTime = saved ? timeOf(saved) : null
  return (
    <div className="title-screen" role="main">
      <PixelIcon icon="skull" color={PALETTE.enemy} scale={3} />
      <h1>He is Coming</h1>
      <p className="title-sub">Three weeks to prepare. Then he arrives.</p>
      {saved && savedTime && (
        <div className="title-actions">
          <button type="button" className="dialog-button" onClick={onContinue} autoFocus>
            Continue · week {saved.week}, {savedTime.phase} {savedTime.day} · {DIFFICULTIES[saved.difficulty].name}
          </button>
        </div>
      )}
      <div className="title-difficulty" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTY_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === difficulty}
            className={`difficulty-option${id === difficulty ? ' is-on' : ''}`}
            onClick={() => onDifficulty(id)}
          >
            {DIFFICULTIES[id].name}
          </button>
        ))}
      </div>
      <p className="title-difficulty-text">{DIFFICULTIES[difficulty].text}</p>
      <div className="title-actions">
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
