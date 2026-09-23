import { useState } from 'react'
import type { EdgeDef, OilKind } from '../../core/items/types'
import type { Equipped } from '../../core/items/loadout'
import type { CraftOption, PickOption, ShopSlot } from '../../core/run/types'
import { PALETTE } from '../../render/palette'
import type { IconName } from '../icons'
import { ItemGlyph } from '../items/ItemGlyph'
import { PixelIcon } from '../PixelIcon'
import { ItemDetails } from './ItemCard'
import './run.css'

const Close = ({ onClose }: { readonly onClose: () => void }) => (
  <button type="button" className="dialog-close" aria-label="Close" onClick={onClose}>
    ×
  </button>
)

const Notice = ({ text }: { readonly text?: string }) =>
  text ? (
    <p className="dialog-notice" role="alert">
      {text}
    </p>
  ) : null

interface ShopProps {
  readonly title: string
  readonly stock: readonly ShopSlot[]
  readonly gold: number
  /** `null` hides rerolling (Bargaining Tent). */
  readonly rerollCost: number | null
  readonly canHaggle: boolean
  readonly notice?: string
  readonly onBuy: (index: number) => void
  readonly onReroll: () => void
  readonly onHaggle: () => void
  readonly onClose: () => void
}

/** Merchant or Bargaining Tent: wares (keys 1–6), reroll (R) or haggle (H), hover for details. */
export function ShopDialog({ title, stock, gold, rerollCost, canHaggle, notice, onBuy, onReroll, onHaggle, onClose }: ShopProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const detail = hovered !== null ? stock[hovered] : undefined
  return (
    <div className="panel run-dialog shop-dialog" role="dialog" aria-label={title}>
      <h2>{title}</h2>
      <Close onClose={onClose} />
      <div className="shop-bar">
        <span className="shop-gold" aria-label={`Your gold ${gold}`}>
          <PixelIcon icon="coin" color={PALETTE.gold} /> {gold}
        </span>
        {rerollCost !== null && (
          <button type="button" className="dialog-button" onClick={onReroll} disabled={gold < rerollCost}>
            Reroll (R) · {rerollCost}
          </button>
        )}
        {canHaggle && (
          <button type="button" className="dialog-button" onClick={onHaggle}>
            Haggle (H)
          </button>
        )}
      </div>
      <div className="shop-grid">
        {stock.map((ware, i) => (
          <button
            key={`${ware.equipped.item.id}-${i}`}
            type="button"
            className={`shop-card${ware.sold ? ' is-sold' : ''}${gold < ware.price ? ' is-dear' : ''}`}
            onClick={() => onBuy(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            disabled={ware.sold}
            aria-label={`Buy ${ware.equipped.item.name} for ${ware.price}`}
          >
            <span className="choice-key">{i + 1}</span>
            <ItemGlyph item={ware.equipped.item} />
            <span className="shop-name">{ware.equipped.item.name}</span>
            <span className="shop-price">{ware.sold ? 'Sold' : <>{ware.price} gold</>}</span>
          </button>
        ))}
      </div>
      <div className="shop-detail">{detail ? <ItemDetails equipped={detail.equipped} /> : <span className="shop-hint">Hover a ware to inspect it.</span>}</div>
      <Notice text={notice} />
    </div>
  )
}

interface ForgeProps {
  readonly options: readonly EdgeDef[]
  readonly cost: number
  readonly current: EdgeDef | null
  readonly weaponName: string
  readonly notice?: string
  readonly onChoose: (index: number) => void
  readonly onClose: () => void
}

/** Forge: pick 1 of 2 edges for the current weapon. */
export function ForgeDialog({ options, cost, current, weaponName, notice, onChoose, onClose }: ForgeProps) {
  return (
    <div className="panel run-dialog forge-dialog" role="dialog" aria-label="Forge">
      <h2>Forge</h2>
      <Close onClose={onClose} />
      <p className="forge-note">
        {current ? `${weaponName} has ${current.name}. Replacing it costs ${cost} gold.` : `Your first edge for ${weaponName} is free.`}
      </p>
      <div className="forge-cards">
        {options.map((edge, i) => (
          <button key={edge.id} type="button" className="choice-card forge-card" onClick={() => onChoose(i)} aria-label={`Forge ${edge.name}`}>
            <span className="choice-key">{i + 1}</span>
            <span className="item-name">{edge.name}</span>
            <span className="item-effect">{edge.text}</span>
          </button>
        ))}
      </div>
      <Notice text={notice} />
    </div>
  )
}

const OIL_STYLE: Record<OilKind, { readonly icon: IconName; readonly color: string; readonly label: string }> = {
  attack: { icon: 'sword', color: PALETTE.attack, label: '+1 attack' },
  armor: { icon: 'shield', color: PALETTE.armor, label: '+1 armor' },
  speed: { icon: 'boots', color: PALETTE.speed, label: '+1 speed' },
}

interface OilProps {
  readonly options: readonly OilKind[]
  readonly weaponName: string
  readonly onChoose: (index: number) => void
  readonly onClose: () => void
}

/** Blade Oil: one oil per stat, per weapon. */
export function OilDialog({ options, weaponName, onChoose, onClose }: OilProps) {
  return (
    <div className="panel run-dialog oil-dialog" role="dialog" aria-label="Blade Oil">
      <h2>Blade Oil</h2>
      <Close onClose={onClose} />
      <p className="forge-note">Coat {weaponName}. Each oil works once per weapon.</p>
      <div className="oil-options">
        {options.map((oil, i) => {
          const style = OIL_STYLE[oil]
          return (
            <button key={oil} type="button" className="dialog-button oil-button" style={{ color: style.color }} onClick={() => onChoose(i)}>
              <span className="choice-key">{i + 1}</span>
              <PixelIcon icon={style.icon} color={style.color} scale={2} />
              {style.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface CraftProps {
  readonly title: string
  readonly options: readonly CraftOption[]
  /** The hero's slots, to show what each option consumes. */
  readonly items: readonly (Equipped | null)[]
  readonly onChoose: (index: number) => void
  readonly onClose: () => void
}

const CRAFT_BLURB: Record<string, string> = {
  Golem: 'Fuse two identical items into one stronger item.',
  Cauldron: 'Cook two ingredients into a dish.',
  Woodcutter: 'Carve two items into one random heroic item.',
}

/** Golem / Cauldron: each option shows its two inputs and the result. */
export function CraftDialog({ title, options, items, onChoose, onClose }: CraftProps) {
  return (
    <div className="panel run-dialog craft-dialog" role="dialog" aria-label={title}>
      <h2>{title}</h2>
      <Close onClose={onClose} />
      <p className="forge-note">{CRAFT_BLURB[title] ?? ''}</p>
      <div className="craft-options">
        {options.slice(0, 6).map((option, i) => (
          <button
            key={`${option.result.item.id}-${option.slots.join('-')}`}
            type="button"
            className="choice-card craft-card"
            onClick={() => onChoose(i)}
            aria-label={`Make ${option.result.item.name}`}
          >
            <span className="choice-key">{i + 1}</span>
            <span className="craft-inputs">
              {option.slots.map((slot) => {
                const input = items[slot]
                return input ? <ItemGlyph key={slot} item={input.item} scale={1} /> : null
              })}
              <span className="craft-arrow">→</span>
              {option.hidden ? <span className="craft-mystery">?</span> : <ItemGlyph item={option.result.item} />}
            </span>
            {option.hidden ? (
              <span className="item-effect">
                {option.slots.map((slot) => items[slot]?.item.name).join(' + ')} → a random heroic item
              </span>
            ) : (
              <ItemDetails equipped={option.result} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

interface PickProps {
  readonly title: string
  readonly text: string
  readonly options: readonly PickOption[]
  readonly notice?: string
  readonly onChoose: (index: number) => void
  readonly onClose: () => void
}

/** Crystal Ball, Waypoint, Fairy, Wishing Well: a short list of labelled choices. */
export function PickDialog({ title, text, options, notice, onChoose, onClose }: PickProps) {
  return (
    <div className="panel run-dialog pick-dialog" role="dialog" aria-label={title}>
      <h2>{title}</h2>
      <Close onClose={onClose} />
      <p className="forge-note">{text}</p>
      <div className="pick-options">
        {options.map((option, i) => (
          <button key={option.id} type="button" className="dialog-button pick-button" onClick={() => onChoose(i)}>
            <span className="pick-key">{i + 1}</span>
            {option.label}
          </button>
        ))}
      </div>
      <Notice text={notice} />
    </div>
  )
}
