import { PALETTE } from '../render/palette'
import type { DemoItem } from './demo/demoItems'
import type { IconName } from './icons'
import { PixelIcon } from './PixelIcon'

const STAT_ICONS: readonly [keyof DemoItem['stats'], IconName, string][] = [
  ['health', 'heart', PALETTE.health],
  ['attack', 'sword', PALETTE.attack],
  ['armor', 'shield', PALETTE.armor],
  ['speed', 'boots', PALETTE.speed],
]

export function Tooltip({ item }: { readonly item: DemoItem }) {
  return (
    <div className="tooltip panel" role="tooltip">
      <div className="tooltip-name">{item.name}</div>
      <div className="tooltip-stats">
        {STAT_ICONS.filter(([key]) => item.stats[key] !== undefined).map(([key, icon, color]) => (
          <span key={key} className="tooltip-stat" style={{ color }}>
            <PixelIcon icon={icon} color={color} />
            {item.stats[key]}
          </span>
        ))}
      </div>
      {item.effect && <div className="tooltip-effect">{item.effect}</div>}
    </div>
  )
}
