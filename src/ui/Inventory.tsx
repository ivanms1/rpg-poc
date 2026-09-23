import { useState } from 'react'
import type { Equipped } from '../core/items/loadout'
import type { Tier } from '../core/items/types'
import { PALETTE } from '../render/palette'
import { RARITY_COLOR } from './rarity'
import { ItemGlyph } from './items/ItemGlyph'
import { Tooltip } from './Tooltip'

const TIER_GEM: Record<Tier, string | null> = { normal: null, golden: PALETTE.speed, diamond: PALETTE.freeze }

interface SlotProps {
  readonly equipped: Equipped | null
  readonly index?: number
  readonly locked?: boolean
  readonly weapon?: boolean
  readonly onHover: (equipped: Equipped | null) => void
  readonly onDiscard?: () => void
}

function Slot({ equipped, index, locked = false, weapon = false, onHover, onDiscard }: SlotProps) {
  const color = equipped ? RARITY_COLOR[equipped.item.rarity] : PALETTE.muted
  const gem = equipped ? TIER_GEM[equipped.tier ?? 'normal'] ?? color : PALETTE.muted
  return (
    <div
      className={`slot${weapon ? ' slot-weapon' : ''}${locked ? ' slot-locked' : ''}`}
      onMouseEnter={() => onHover(equipped)}
      onMouseLeave={() => onHover(null)}
      onDoubleClick={equipped && onDiscard ? onDiscard : undefined}
      aria-label={equipped ? equipped.item.name : locked ? 'Locked slot' : 'Empty slot'}
    >
      {index !== undefined && <span className="slot-index">{index}</span>}
      {!locked && <span className="slot-gem" style={{ background: gem }} />}
      {equipped && (
        <span className="slot-glyph">
          <ItemGlyph item={equipped.item} />
        </span>
      )}
    </div>
  )
}

interface Props {
  readonly weapon: Equipped | null
  /** Unlocked slots (null = empty). Remaining slots up to `total` show as locked. */
  readonly items: readonly (Equipped | null)[]
  readonly total: number
  readonly onDiscard?: (slot: number) => void
}

export function Inventory({ weapon, items, total, onDiscard }: Props) {
  const [hovered, setHovered] = useState<Equipped | null>(null)
  const slots = Array.from({ length: total }, (_, i) => ({ equipped: items[i] ?? null, locked: i >= items.length }))

  return (
    <>
      <section className="panel weapon-panel" aria-label="Weapon">
        <Slot equipped={weapon} weapon onHover={setHovered} />
      </section>
      <section className="panel items-panel" aria-label="Items">
        <div className="slot-grid">
          {slots.map(({ equipped, locked }, i) => (
            <Slot
              key={i}
              equipped={equipped}
              index={i + 1}
              locked={locked}
              onHover={setHovered}
              onDiscard={
                onDiscard &&
                (() => {
                  setHovered(null)
                  onDiscard(i)
                })
              }
            />
          ))}
        </div>
      </section>
      {hovered && <Tooltip equipped={hovered} discardable={Boolean(onDiscard) && hovered !== weapon} />}
    </>
  )
}
