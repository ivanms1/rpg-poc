import { ITEMS, ITEMS_BY_ID } from '../../data/items'
import { WEAPONS, WEAPONS_BY_ID } from '../../data/weapons'
import { itemIcon, MATERIAL } from './itemIcon'
import { ITEM_SHAPES } from './shapes'
import { RARITY_COLOR } from '../rarity'

describe('itemIcon', () => {
  it('gives every weapon and item a specific shape (no fallback pouch)', () => {
    const missing = [...WEAPONS, ...ITEMS].filter((i) => itemIcon(i).shape === 'pouch').map((i) => i.name)
    expect(missing).toEqual([])
  })

  it('all shapes are 12×12', () => {
    for (const rows of Object.values(ITEM_SHAPES)) {
      expect(rows).toHaveLength(12)
      for (const row of rows) expect(row).toHaveLength(12)
    }
  })

  it.each([
    ['sword-of-the-hero', 'sword', MATERIAL.hero],
    ['bloodmoon-dagger', 'dagger', MATERIAL.blood],
    ['battle-axe', 'axe', MATERIAL.iron],
    ['spearshield-lance', 'spear', RARITY_COLOR.common],
    ['brittlebark-bow', 'bow', MATERIAL.wood],
    ['wooden-stick', 'staff', MATERIAL.wood],
    ['frozen-iceblade', 'sword', MATERIAL.frost],
    ['lifesteal-scythe', 'scythe', MATERIAL.blood],
  ])('weapon %s → %s', (id, shape, color) => {
    expect(itemIcon(WEAPONS_BY_ID[id]!)).toEqual({ shape, color })
  })

  it.each([
    ['horned-helmet', 'horned', MATERIAL.thorn],
    ['iceblock-shield', 'shield', MATERIAL.frost],
    ['ruby-ring', 'ring', MATERIAL.blood],
    ['ruby-earring', 'earring', MATERIAL.blood],
    ['emerald-crown', 'crown', MATERIAL.emerald],
    ['chainmail-armor', 'armor', MATERIAL.iron],
    ['stone-steak', 'meat', MATERIAL.iron],
    ['heart-shaped-acorn', 'nut', MATERIAL.wood],
    ['vampiric-wine', 'bottle', MATERIAL.blood],
    ['iron-shrapnel', 'bomb', MATERIAL.iron],
    ['leather-boots', 'boots', MATERIAL.leather],
    ['swiftstrike-belt', 'belt', MATERIAL.swift],
  ])('item %s → %s', (id, shape, color) => {
    expect(itemIcon(ITEMS_BY_ID[id]!)).toEqual({ shape, color })
  })

  it('falls back to a pouch tinted by rarity', () => {
    const odd = { ...ITEMS_BY_ID['gold-ring']!, name: 'Mystery Thing', kind: 'item' as const }
    expect(itemIcon(odd).shape).toBe('pouch')
  })
})
