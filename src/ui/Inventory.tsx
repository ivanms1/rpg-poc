import { useState } from 'react'
import type { Equipped } from '../core/items/loadout'
import type { Tier } from '../core/items/types'
import { PALETTE } from '../render/palette'
import { ItemGlyph } from './items/ItemGlyph'
import { RARITY_COLOR } from './rarity'
import { Tooltip } from './Tooltip'

const TIER_GEM: Record<Tier, string | null> = { normal: null, golden: PALETTE.speed, diamond: PALETTE.freeze }
const DRAG_TYPE = 'text/x-hic-slot'

interface Hovered {
  readonly equipped: Equipped
  readonly weapon: boolean
}

interface DragHandlers {
  readonly onStart: () => void
  readonly onOver: () => void
  readonly onDrop: () => void
  readonly onEnd: () => void
}

interface SlotProps {
  readonly equipped: Equipped | null
  readonly index?: number
  readonly locked?: boolean
  readonly weapon?: boolean
  readonly dragOver?: boolean
  readonly onHover: (hovered: Hovered | null) => void
  readonly onDiscard?: () => void
  readonly drag?: DragHandlers
}

function Slot({ equipped, index, locked = false, weapon = false, dragOver = false, onHover, onDiscard, drag }: SlotProps) {
  const color = equipped ? RARITY_COLOR[equipped.item.rarity] : PALETTE.muted
  const gem = equipped ? (TIER_GEM[equipped.tier ?? 'normal'] ?? color) : PALETTE.muted
  const canDrag = Boolean(drag && equipped && !locked)
  const dropTarget = drag && !locked ? drag : undefined
  return (
    <div
      className={`slot${weapon ? ' slot-weapon' : ''}${locked ? ' slot-locked' : ''}${dragOver ? ' is-drag-over' : ''}`}
      onMouseEnter={() => onHover(equipped ? { equipped, weapon } : null)}
      onMouseLeave={() => onHover(null)}
      onDoubleClick={equipped && onDiscard ? onDiscard : undefined}
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return
        e.dataTransfer.setData(DRAG_TYPE, String(index))
        e.dataTransfer.effectAllowed = 'move'
        drag?.onStart()
      }}
      onDragOver={(e) => {
        if (!dropTarget) return
        e.preventDefault()
        dropTarget.onOver()
      }}
      onDrop={(e) => {
        if (!dropTarget) return
        e.preventDefault()
        dropTarget.onDrop()
      }}
      onDragEnd={drag?.onEnd}
      aria-label={equipped ? equipped.item.name : locked ? 'Locked slot' : 'Empty slot'}
    >
      {index !== undefined && <span className="slot-index">{index + 1}</span>}
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
  readonly onReorder?: (from: number, to: number) => void
  /** Extra tooltip lines (set progress, weapon upgrades). */
  readonly describe?: (equipped: Equipped, weapon: boolean) => readonly string[]
}

export function Inventory({ weapon, items, total, onDiscard, onReorder, describe }: Props) {
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const slots = Array.from({ length: total }, (_, i) => ({ equipped: items[i] ?? null, locked: i >= items.length }))

  const endDrag = () => {
    setDragFrom(null)
    setDragOver(null)
  }

  const dragFor = (i: number): DragHandlers | undefined =>
    onReorder && {
      onStart: () => {
        setHovered(null)
        setDragFrom(i)
      },
      onOver: () => setDragOver(i),
      onDrop: () => {
        if (dragFrom !== null) onReorder(dragFrom, i)
        endDrag()
      },
      onEnd: endDrag,
    }

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
              index={i}
              locked={locked}
              dragOver={dragOver === i && dragFrom !== i}
              onHover={setHovered}
              onDiscard={
                onDiscard &&
                (() => {
                  setHovered(null)
                  onDiscard(i)
                })
              }
              drag={dragFor(i)}
            />
          ))}
        </div>
      </section>
      {hovered && dragFrom === null && (
        <Tooltip
          equipped={hovered.equipped}
          discardable={Boolean(onDiscard) && !hovered.weapon}
          extra={describe?.(hovered.equipped, hovered.weapon) ?? []}
        />
      )}
    </>
  )
}
