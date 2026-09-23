import { useState } from 'react'
import type { Equipped } from '../core/items/loadout'
import type { Rarity, Tier } from '../core/items/types'
import { PALETTE } from '../render/palette'
import { Tooltip } from './Tooltip'

const RARITY_COLOR: Record<Rarity, string> = {
  common: PALETTE.frame,
  rare: PALETTE.armor,
  heroic: PALETTE.shop,
  mythic: PALETTE.night,
}

const TIER_GEM: Record<Tier, string | null> = { normal: null, golden: PALETTE.speed, diamond: PALETTE.freeze }

interface SlotProps {
  readonly equipped: Equipped | null
  readonly index?: number
  readonly locked?: boolean
  readonly weapon?: boolean
  readonly onHover: (equipped: Equipped | null) => void
}

function Slot({ equipped, index, locked = false, weapon = false, onHover }: SlotProps) {
  const color = equipped ? RARITY_COLOR[equipped.item.rarity] : PALETTE.muted
  const gem = equipped ? TIER_GEM[equipped.tier ?? 'normal'] ?? color : PALETTE.muted
  return (
    <div
      className={`slot${weapon ? ' slot-weapon' : ''}${locked ? ' slot-locked' : ''}`}
      onMouseEnter={() => onHover(equipped)}
      onMouseLeave={() => onHover(null)}
      aria-label={equipped ? equipped.item.name : locked ? 'Locked slot' : 'Empty slot'}
    >
      {index !== undefined && <span className="slot-index">{index}</span>}
      {!locked && <span className="slot-gem" style={{ background: gem }} />}
      {equipped && (
        <span className="slot-glyph" style={{ color }}>
          {equipped.item.name.charAt(0)}
        </span>
      )}
    </div>
  )
}

interface Props {
  readonly weapon: Equipped | null
  readonly items: readonly (Equipped | null)[]
  readonly unlocked: number
  readonly total: number
}

export function Inventory({ weapon, items, unlocked, total }: Props) {
  const [hovered, setHovered] = useState<Equipped | null>(null)
  const slots = Array.from({ length: total }, (_, i) => (i < unlocked ? items[i] ?? null : null))

  return (
    <>
      <section className="panel weapon-panel" aria-label="Weapon">
        <Slot equipped={weapon} weapon onHover={setHovered} />
      </section>
      <section className="panel items-panel" aria-label="Items">
        <div className="slot-grid">
          {slots.map((equipped, i) => (
            <Slot key={i} equipped={equipped} index={i + 1} locked={i >= unlocked} onHover={setHovered} />
          ))}
        </div>
      </section>
      {hovered && <Tooltip equipped={hovered} />}
    </>
  )
}
