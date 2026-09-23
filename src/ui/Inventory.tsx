import { useState } from 'react'
import { PALETTE } from '../render/palette'
import type { DemoItem, Rarity } from './demo/demoItems'
import { Tooltip } from './Tooltip'

const RARITY_COLOR: Record<Rarity, string> = {
  common: PALETTE.frame,
  rare: PALETTE.armor,
  heroic: PALETTE.shop,
  mythic: PALETTE.night,
}

interface SlotProps {
  readonly item: DemoItem | null
  readonly index?: number
  readonly locked?: boolean
  readonly weapon?: boolean
  readonly onHover: (item: DemoItem | null) => void
}

function Slot({ item, index, locked = false, weapon = false, onHover }: SlotProps) {
  const color = item ? RARITY_COLOR[item.rarity] : PALETTE.muted
  return (
    <div
      className={`slot${weapon ? ' slot-weapon' : ''}${locked ? ' slot-locked' : ''}`}
      onMouseEnter={() => onHover(item)}
      onMouseLeave={() => onHover(null)}
      aria-label={item ? item.name : locked ? 'Locked slot' : 'Empty slot'}
    >
      {index !== undefined && <span className="slot-index">{index}</span>}
      {!locked && <span className="slot-gem" style={{ background: color }} />}
      {item && (
        <span className="slot-glyph" style={{ color }}>
          {item.name.charAt(0)}
        </span>
      )}
    </div>
  )
}

interface Props {
  readonly weapon: DemoItem | null
  readonly items: readonly (DemoItem | null)[]
  readonly unlocked: number
  readonly total: number
}

export function Inventory({ weapon, items, unlocked, total }: Props) {
  const [hovered, setHovered] = useState<DemoItem | null>(null)
  const slots = Array.from({ length: total }, (_, i) => (i < unlocked ? items[i] ?? null : null))

  return (
    <>
      <section className="panel weapon-panel" aria-label="Weapon">
        <Slot item={weapon} weapon onHover={setHovered} />
      </section>
      <section className="panel items-panel" aria-label="Items">
        <div className="slot-grid">
          {slots.map((item, i) => (
            <Slot key={i} item={item} index={i + 1} locked={i >= unlocked} onHover={setHovered} />
          ))}
        </div>
      </section>
      {hovered && <Tooltip item={hovered} />}
    </>
  )
}
