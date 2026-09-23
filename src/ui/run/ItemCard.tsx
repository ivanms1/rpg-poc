import { describeItem, type Equipped } from '../../core/items/loadout'
import { TIER_MULTIPLIER, type ItemStats } from '../../core/items/types'
import { PALETTE } from '../../render/palette'
import type { IconName } from '../icons'
import { PixelIcon } from '../PixelIcon'
import { RARITY_COLOR } from '../rarity'

const STAT_ICONS: readonly [keyof ItemStats, IconName, string][] = [
  ['health', 'heart', PALETTE.health],
  ['attack', 'sword', PALETTE.attack],
  ['armor', 'shield', PALETTE.armor],
  ['speed', 'boots', PALETTE.speed],
]

const TIER_LABEL = { normal: '', golden: 'Golden ', diamond: 'Diamond ' } as const

/** Name, rarity, tier-scaled stats and effect text of one item. */
export function ItemDetails({ equipped }: { readonly equipped: Equipped }) {
  const { item, tier = 'normal' } = equipped
  const scale = TIER_MULTIPLIER[tier]
  const text = describeItem(item, tier)
  return (
    <>
      <div className="item-name" style={{ color: RARITY_COLOR[item.rarity] }}>
        {TIER_LABEL[tier]}
        {item.name}
      </div>
      <div className="item-meta">
        {item.kind === 'weapon' ? 'weapon · ' : ''}
        {item.rarity}
        {item.tags.length > 0 && ` · ${item.tags.join(', ')}`}
      </div>
      <div className="item-stats">
        {STAT_ICONS.filter(([key]) => item.stats[key] !== undefined).map(([key, icon, color]) => (
          <span key={key} className="item-stat" style={{ color }}>
            <PixelIcon icon={icon} color={color} />
            {(item.stats[key] ?? 0) * scale}
          </span>
        ))}
      </div>
      {text && <div className="item-effect">{text}</div>}
    </>
  )
}
