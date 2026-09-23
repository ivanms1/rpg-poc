import type { Equipped } from '../../core/items/loadout'
import type { ItemDef } from '../../core/items/types'
import { ITEMS_BY_ID } from '../../data/items'
import { WEAPONS_BY_ID } from '../../data/weapons'

/** Starter kit for the Phase 2 demo. Real runs start with a Wooden Stick and pick up gear (Phase 3–4). */
const must = (def: ItemDef | undefined, id: string): ItemDef => {
  if (!def) throw new Error(`demoLoadout: unknown item ${id}`)
  return def
}
const weapon = (id: string): Equipped => ({ item: must(WEAPONS_BY_ID[id], id) })
const item = (id: string, tier: Equipped['tier'] = 'normal'): Equipped => ({ item: must(ITEMS_BY_ID[id], id), tier })

export const DEMO_WEAPON: Equipped = weapon('razorthorn-spear')

export const DEMO_ITEMS: readonly (Equipped | null)[] = [
  item('horned-helmet'),
  item('redwood-cloak'),
  item('double-plated-armor', 'golden'),
  item('ruby-earring'),
]

export const DEMO_UNLOCKED_SLOTS = 4
export const DEMO_TOTAL_SLOTS = 8
