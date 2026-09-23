import type { Tier } from '../../core/items/types'
import { ITEMS } from '../../data/items'
import { WEAPONS } from '../../data/weapons'

export interface SlotChoice {
  readonly id: string
  readonly tier: Tier
}

export interface LoadoutChoice {
  readonly weaponId: string
  readonly slots: readonly SlotChoice[]
  readonly slotCount: 4 | 6 | 8
  readonly hp: number
  readonly baseHealth: number
  readonly gold: number
}

const TIERS: readonly Tier[] = ['normal', 'golden', 'diamond']
const SLOT_COUNTS = [4, 6, 8] as const

interface Props {
  readonly value: LoadoutChoice
  readonly onChange: (next: LoadoutChoice) => void
}

const numberInput = (label: string, value: number, onChange: (n: number) => void, min = 0) => (
  <label className="arena-field">
    {label}
    <input type="number" min={min} value={value} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))} />
  </label>
)

export function LoadoutForm({ value, onChange }: Props) {
  const setSlot = (index: number, patch: Partial<SlotChoice>) =>
    onChange({ ...value, slots: value.slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)) })

  return (
    <fieldset className="arena-box">
      <legend>Hero</legend>
      <label className="arena-field">
        Weapon
        <select value={value.weaponId} onChange={(e) => onChange({ ...value, weaponId: e.target.value })}>
          {WEAPONS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.rarity})
            </option>
          ))}
        </select>
      </label>
      <div className="arena-row">
        {numberInput('Base health', value.baseHealth, (baseHealth) => onChange({ ...value, baseHealth }), 1)}
        {numberInput('Current HP (0 = full)', value.hp, (hp) => onChange({ ...value, hp }))}
        {numberInput('Gold', value.gold, (gold) => onChange({ ...value, gold }))}
        <label className="arena-field">
          Slots
          <select value={value.slotCount} onChange={(e) => onChange({ ...value, slotCount: Number(e.target.value) as 4 | 6 | 8 })}>
            {SLOT_COUNTS.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <ol className="arena-slots">
        {value.slots.slice(0, value.slotCount).map((slot, i) => (
          <li key={i}>
            <select aria-label={`Slot ${i + 1}`} value={slot.id} onChange={(e) => setSlot(i, { id: e.target.value })}>
              <option value="">— empty —</option>
              {ITEMS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select aria-label={`Slot ${i + 1} tier`} value={slot.tier} onChange={(e) => setSlot(i, { tier: e.target.value as Tier })}>
              {TIERS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </li>
        ))}
      </ol>
    </fieldset>
  )
}
