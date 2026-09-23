import { useEffect, useRef, useState } from 'react'
import type { Equipped } from '../core/items/loadout'
import type { Tier } from '../core/items/types'
import { PALETTE } from '../render/palette'
import { ItemGlyph } from './items/ItemGlyph'
import { RARITY_COLOR } from './rarity'
import { Tooltip } from './Tooltip'

const TIER_GEM: Record<Tier, string | null> = { normal: null, golden: PALETTE.speed, diamond: PALETTE.freeze }
const DRAG_TYPE = 'text/x-hic-slot'
const HOVER_HINT = 'Drag to reorder · double-click to discard'
const PINNED_HINT = 'Tap another slot to move it there'

type Target = number | 'weapon'

/**
 * A slot picked by a tap or click: its tooltip stays open. Only a touch selection moves to the next
 * tapped slot; with a mouse, dragging moves and a click just pins (so a double-click never swaps).
 */
interface Selected {
  readonly target: Target
  readonly touch: boolean
}

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
  readonly selected?: boolean
  readonly onHover: (hovered: Hovered | null) => void
  readonly onTap?: (touch: boolean) => void
  readonly onDiscard?: () => void
  readonly drag?: DragHandlers
}

function Slot({ equipped, index, locked = false, weapon = false, dragOver = false, selected = false, onHover, onTap, onDiscard, drag }: SlotProps) {
  const color = equipped ? RARITY_COLOR[equipped.item.rarity] : PALETTE.muted
  const gem = equipped ? (TIER_GEM[equipped.tier ?? 'normal'] ?? color) : PALETTE.muted
  const canDrag = Boolean(drag && equipped && !locked)
  /** Double-click discards only with a mouse: on touch, two quick taps just select and let go. */
  const pointer = useRef('mouse')
  const dropTarget = drag && !locked ? drag : undefined
  return (
    <div
      className={`slot${weapon ? ' slot-weapon' : ''}${locked ? ' slot-locked' : ''}${dragOver ? ' is-drag-over' : ''}${selected ? ' is-selected' : ''}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(equipped ? { equipped, weapon } : null)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
      onPointerDown={(e) => {
        pointer.current = e.pointerType
      }}
      onClick={(e) => {
        const touch = pointer.current !== 'mouse'
        if (touch || e.detail <= 1) onTap?.(touch)
      }}
      onDoubleClick={equipped && onDiscard ? () => pointer.current === 'mouse' && onDiscard() : undefined}
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
  const [selected, setSelected] = useState<Selected | null>(null)
  const slots = Array.from({ length: total }, (_, i) => ({ equipped: items[i] ?? null, locked: i >= items.length }))
  const at = (target: Target): Equipped | null => (target === 'weapon' ? weapon : (items[target] ?? null))
  const selectedItem = selected === null ? null : at(selected.target)
  const pickedSlot = selected && typeof selected.target === 'number' ? selected.target : null

  /** First tap picks an item; with touch, a tap on another item slot moves it there; tapping it again lets go. */
  const tap = (target: Target, touch: boolean) => {
    if (selected?.target === target) return setSelected(null)
    if (touch && selected?.touch && pickedSlot !== null && typeof target === 'number' && selectedItem && onReorder) {
      onReorder(pickedSlot, target)
      return setSelected(null)
    }
    setSelected(at(target) ? { target, touch } : null)
  }

  // A tap anywhere outside the inventory lets go of the selection.
  useEffect(() => {
    if (selected === null) return
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('.slot, .tooltip')) setSelected(null)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [selected])

  const endDrag = () => {
    setDragFrom(null)
    setDragOver(null)
  }

  const dragFor = (i: number): DragHandlers | undefined =>
    onReorder && {
      onStart: () => {
        setHovered(null)
        setSelected(null)
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
        <Slot equipped={weapon} weapon selected={selected?.target === 'weapon'} onHover={setHovered} onTap={(touch) => tap('weapon', touch)} />
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
              selected={selected?.target === i}
              onHover={setHovered}
              onTap={locked ? () => setSelected(null) : (touch) => tap(i, touch)}
              onDiscard={
                onDiscard &&
                (() => {
                  setHovered(null)
                  setSelected(null)
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
          hint={onDiscard && !hovered.weapon ? HOVER_HINT : undefined}
          extra={describe?.(hovered.equipped, hovered.weapon) ?? []}
        />
      )}
      {!hovered && selectedItem && selected && dragFrom === null && (
        <Tooltip
          equipped={selectedItem}
          hint={pickedSlot !== null && onReorder ? (selected.touch ? PINNED_HINT : HOVER_HINT) : undefined}
          extra={describe?.(selectedItem, selected.target === 'weapon') ?? []}
          onDiscard={
            pickedSlot !== null && onDiscard
              ? () => {
                  setSelected(null)
                  onDiscard(pickedSlot)
                }
              : undefined
          }
        />
      )}
    </>
  )
}
