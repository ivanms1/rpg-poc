/** Static inventory for the Phase 0 mock. Real item types/data arrive with the combat engine (Phase 1). */
export type Rarity = 'common' | 'rare' | 'heroic' | 'mythic'

export interface DemoItem {
  readonly name: string
  readonly rarity: Rarity
  readonly stats: { readonly attack?: number; readonly armor?: number; readonly speed?: number; readonly health?: number }
  readonly effect?: string
}

export const DEMO_WEAPON: DemoItem = { name: 'Razorthorn Spear', rarity: 'common', stats: { attack: 1 }, effect: 'On Hit: Gain 2 thorns' }

export const DEMO_ITEMS: readonly (DemoItem | null)[] = [
  { name: 'Horned Helmet', rarity: 'common', stats: { armor: 2 }, effect: 'Battle Start: Gain 1 thorns' },
  { name: 'Redwood Cloak', rarity: 'common', stats: { health: 2 }, effect: 'Battle Start: If your health is not full, restore 2 health' },
  { name: 'Double-plated Armor', rarity: 'common', stats: { armor: 2, speed: -2 }, effect: 'Exposed: Gain 3 armor' },
  null,
]

export const DEMO_UNLOCKED_SLOTS = 4
export const DEMO_TOTAL_SLOTS = 8
