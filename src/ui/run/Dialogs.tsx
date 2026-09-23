import type { Equipped } from '../../core/items/loadout'
import type { BossDef } from '../../core/items/types'
import { PALETTE } from '../../render/palette'
import { StatRow } from '../StatPanel'
import { ItemGlyph } from '../items/ItemGlyph'
import { ItemDetails } from './ItemCard'
import './run.css'

interface ChoiceProps {
  readonly title: string
  readonly options: readonly Equipped[]
  readonly notice?: string
  readonly onChoose: (index: number) => void
  readonly onClose: () => void
}

/** Chest / weapon pile: pick one of the offered items (keys 1–3), Esc to leave it for later. */
export function ChoiceDialog({ title, options, notice, onChoose, onClose }: ChoiceProps) {
  return (
    <div className="panel run-dialog choice-dialog" role="dialog" aria-label={title}>
      <h2>{title}</h2>
      <button type="button" className="dialog-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="choice-cards">
        {options.map((option, i) => (
          <button key={`${option.item.id}-${i}`} type="button" className="choice-card" onClick={() => onChoose(i)} aria-label={`Take ${option.item.name}`}>
            <span className="choice-key">{i + 1}</span>
            <span className="choice-icon">
              <ItemGlyph item={option.item} scale={2} />
            </span>
            <ItemDetails equipped={option} />
          </button>
        ))}
      </div>
      {notice && (
        <p className="dialog-notice" role="alert">
          {notice}
        </p>
      )}
    </div>
  )
}

interface MessageProps {
  readonly title: string
  readonly text: string
  readonly onClose: () => void
}

export function MessageDialog({ title, text, onClose }: MessageProps) {
  return (
    <div className="panel run-dialog message-dialog" role="dialog" aria-label={title}>
      <h2>{title}</h2>
      <p>{text}</p>
      <button type="button" className="dialog-button" onClick={onClose} autoFocus>
        Continue
      </button>
    </div>
  )
}

interface BossProps {
  readonly boss: BossDef
  readonly week: number
  readonly onFight: () => void
  readonly onClose: () => void
}

/** Tab: preview this week's boss, optionally fight it early. */
export function BossPreview({ boss, week, onFight, onClose }: BossProps) {
  return (
    <div className="panel run-dialog boss-dialog" role="dialog" aria-label="Boss preview">
      <h2 style={{ color: PALETTE.enemy }}>{boss.name}</h2>
      <p className="boss-when">Arrives at the end of week {week}</p>
      <div className="boss-body">
        <div className="boss-stats">
          <StatRow icon="heart" color={PALETTE.health} value={boss.stats.maxHp} label="Boss health" />
          <StatRow icon="sword" color={PALETTE.attack} value={boss.stats.attack} label="Boss attack" />
          <StatRow icon="shield" color={PALETTE.armor} value={boss.stats.armor} label="Boss armor" />
          <StatRow icon="boots" color={PALETTE.speed} value={boss.stats.speed} label="Boss speed" />
        </div>
        <p>{boss.text}</p>
      </div>
      <div className="dialog-actions">
        <button type="button" className="dialog-button" onClick={onClose}>
          Close (Tab)
        </button>
        <button type="button" className="dialog-button is-danger" onClick={onFight}>
          Fight now
        </button>
      </div>
    </div>
  )
}

interface EndProps {
  readonly victory: boolean
  readonly week: number
  readonly gold: number
  readonly seed: number
  readonly onRestart: () => void
}

export function EndScreen({ victory, week, gold, seed, onRestart }: EndProps) {
  return (
    <div className="panel run-dialog end-dialog" role="dialog" aria-label={victory ? 'Victory' : 'Game over'}>
      <h2 style={{ color: victory ? PALETTE.health : PALETTE.enemy }}>{victory ? 'The forest is saved' : 'You have fallen'}</h2>
      <p>
        {victory ? 'All three bosses are defeated.' : `Fell in week ${week}.`} Gold: {gold}. Seed {seed}.
      </p>
      <button type="button" className="dialog-button" onClick={onRestart} autoFocus>
        New run (R)
      </button>
    </div>
  )
}
