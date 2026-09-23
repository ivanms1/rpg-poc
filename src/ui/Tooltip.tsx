import type { Equipped } from '../core/items/loadout'
import { ItemDetails } from './run/ItemCard'

interface Props {
  readonly equipped: Equipped
  readonly discardable: boolean
  readonly extra?: readonly string[]
}

export function Tooltip({ equipped, discardable, extra = [] }: Props) {
  return (
    <div className="tooltip panel" role="tooltip">
      <ItemDetails equipped={equipped} />
      {extra.map((line) => (
        <div key={line} className="tooltip-extra">
          {line}
        </div>
      ))}
      {discardable && <div className="tooltip-hint">Drag to reorder · double-click to discard</div>}
    </div>
  )
}
