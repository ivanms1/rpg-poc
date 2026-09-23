import { describeItem, type Equipped } from '../core/items/loadout'
import { TIER_MULTIPLIER, type ItemStats } from '../core/items/types'
import { PALETTE } from '../render/palette'
import type { IconName } from './icons'
import { PixelIcon } from './PixelIcon'

const STAT_ICONS: readonly [keyof ItemStats, IconName, string][] = [
  ['health', 'heart', PALETTE.health],
  ['attack', 'sword', PALETTE.attack],
  ['armor', 'shield', PALETTE.armor],
  ['speed', 'boots', PALETTE.speed],
]

const TIER_LABEL = { normal: '', golden: 'Golden ', diamond: 'Diamond ' } as const

export function Tooltip({ equipped }: { readonly equipped: Equipped }) {
  const { item, tier = 'normal' } = equipped
  const scale = TIER_MULTIPLIER[tier]
  const text = describeItem(item, tier)
  return (
    <div className="tooltip panel" role="tooltip">
      <div className="tooltip-name">
        {TIER_LABEL[tier]}
        {item.name}
      </div>
      <div className="tooltip-meta">
        {item.rarity}
        {item.tags.length > 0 && ` · ${item.tags.join(', ')}`}
      </div>
      <div className="tooltip-stats">
        {STAT_ICONS.filter(([key]) => item.stats[key] !== undefined).map(([key, icon, color]) => (
          <span key={key} className="tooltip-stat" style={{ color }}>
            <PixelIcon icon={icon} color={color} />
            {(item.stats[key] ?? 0) * scale}
          </span>
        ))}
      </div>
      {text && <div className="tooltip-effect">{text}</div>}
    </div>
  )
}
