import { useState } from 'react'
import type { EdgeDef, OilKind } from '../../core/items/types'
import type { ShopSlot } from '../../core/run/types'
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
  readonly stock: readonly ShopSlot[]
  readonly gold: number
  readonly rerollCost: number
  readonly notice?: string
  readonly onBuy: (index: number) => void
  readonly onReroll: () => void
  readonly onClose: () => void
}

/** Traveling Merchant: 6 wares (keys 1–6), reroll (R), hover for details. */
export function ShopDialog({ stock, gold, rerollCost, notice, onBuy, onReroll, onClose }: ShopProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const detail = hovered !== null ? stock[hovered] : undefined
  return (
    <div className="panel run-dialog shop-dialog" role="dialog" aria-label="Traveling Merchant">
      <h2>Traveling Merchant</h2>
      <Close onClose={onClose} />
      <div className="shop-bar">
        <span className="shop-gold" aria-label={`Your gold ${gold}`}>
          <PixelIcon icon="coin" color={PALETTE.gold} /> {gold}
        </span>
        <button type="button" className="dialog-button" onClick={onReroll} disabled={gold < rerollCost}>
          Reroll (R) · {rerollCost}
        </button>
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
