import type { Equipped } from '../core/items/loadout'
import { ItemDetails } from './run/ItemCard'

export function Tooltip({ equipped, discardable }: { readonly equipped: Equipped; readonly discardable: boolean }) {
  return (
    <div className="tooltip panel" role="tooltip">
      <ItemDetails equipped={equipped} />
      {discardable && <div className="tooltip-hint">Double-click to discard</div>}
    </div>
  )
}
