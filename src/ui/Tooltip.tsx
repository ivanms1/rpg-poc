import type { Equipped } from '../core/items/loadout'
import { ItemDetails } from './run/ItemCard'

interface Props {
  readonly equipped: Equipped
  readonly extra?: readonly string[]
  readonly hint?: string
  /** Shown as a button when the tooltip is pinned by a tap (touch has no double-click). */
  readonly onDiscard?: () => void
}

export function Tooltip({ equipped, extra = [], hint, onDiscard }: Props) {
  return (
    <div className={`tooltip panel${onDiscard ? ' is-pinned' : ''}`} role="tooltip">
      <ItemDetails equipped={equipped} />
      {extra.map((line) => (
        <div key={line} className="tooltip-extra">
          {line}
        </div>
      ))}
      {hint && <div className="tooltip-hint">{hint}</div>}
      {onDiscard && (
        <button type="button" className="tooltip-discard" onClick={onDiscard}>
          Discard
        </button>
      )}
    </div>
  )
}
