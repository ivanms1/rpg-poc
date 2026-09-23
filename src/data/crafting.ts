/**
 * Crafting: Woodland cauldron dishes (wiki: Cauldron, 2025 values) and weapon merges
 * (wiki: Weapon_modifications). Results never drop from normal loot.
 */
import { bombDamage, damageEnemy, gain, gainStatus, healthFull, repeat, restore, seq, when } from '../core/effects/dsl'
import type { ItemDef, Recipe } from '../core/items/types'
import { item, weapon } from './define'

export const HONEYCOMB = item('Honeycomb', {
  rarity: 'rare',
  tags: ['food'],
  text: 'A super-ingredient. Cook it with another food at a Cauldron.',
  drop: false,
})

const dish = (name: string, spec: Omit<Parameters<typeof item>[1], 'rarity' | 'drop'>): ItemDef =>
  item(name, { rarity: 'rare', ...spec, tags: ['food', ...(spec.tags ?? [])], drop: false })

const cherryCocktail = seq(bombDamage(3), restore(3))

export const DISHES = {
  sugarBomb: dish('Sugar Bomb', { tags: ['bomb'], text: 'Turn Start: Deal 1 damage 3 times', effect: () => ({ hooks: { turnStart: repeat(3, bombDamage(1)) } }) }),
  explosiveRoast: dish('Explosive Roast', {
    tags: ['bomb'],
    stats: { health: 5 },
    text: 'Battle Start: Deal 1 damage 3 times',
    effect: () => ({ hooks: { battleStart: repeat(3, bombDamage(1)) } }),
  }),
  trailMix: dish('Trail Mix', {
    tags: ['bomb'],
    text: 'Battle Start: Deal 1 damage and gain 1 thorns. Repeat 2 times',
    effect: () => ({ hooks: { battleStart: repeat(2, seq(bombDamage(1), gainStatus('thorns', 1))) } }),
  }),
  graniteCherry: dish('Granite Cherry', {
    tags: ['bomb', 'stone'],
    text: 'Battle Start: If your health is full, gain 2 armor and deal 2 damage. Repeat 3 times',
    effect: () => ({ hooks: { battleStart: when(healthFull, repeat(3, seq(gain('armor', 2), bombDamage(2)))) } }),
  }),
  cherryCocktail: dish('Cherry Cocktail', {
    tags: ['bomb', 'sanguine'],
    text: 'Battle Start & Wounded: Deal 3 damage and restore 3 health',
    effect: () => ({ hooks: { battleStart: cherryCocktail, wounded: cherryCocktail } }),
  }),
  honeyHam: dish('Honey Ham', { text: 'Double your max health', baseModifier: (st) => ({ ...st, maxHp: st.maxHp * 2 }) }),
  candiedNuts: dish('Candied Nuts', {
    text: 'Battle Start: Gain 3 thorns. Thorns deal double damage',
    effect: () => ({
      hooks: { battleStart: gainStatus('thorns', 3) },
      outgoingDamage: (_s, _self, amount, kind) => (kind === 'thorns' ? amount * 2 : amount),
    }),
  }),
  rockCandy: dish('Rock Candy', {
    tags: ['stone'],
    text: 'Battle start: Gain 15 armor. If your health is full, gain an additional 15 armor',
    effect: () => ({ hooks: { battleStart: seq(when(healthFull, gain('armor', 15)), gain('armor', 15)) } }),
  }),
  sweetWine: dish('Sweet Wine', { tags: ['sanguine'], text: 'Wounded: Restore 30 health', effect: () => ({ hooks: { wounded: restore(30) } }) }),
  roastedChestnut: dish('Roasted Chestnut', {
    stats: { health: 5 },
    text: 'Battle Start: Gain 4 thorns',
    effect: () => ({ hooks: { battleStart: gainStatus('thorns', 4) } }),
  }),
  rockRoast: dish('Rock Roast', { tags: ['stone'], stats: { health: 6, armor: 6 } }),
  bloodSausage: dish('Blood Sausage', {
    tags: ['sanguine'],
    stats: { health: 5 },
    text: 'Wounded: Restore 1 health 5 times',
    effect: () => ({ hooks: { wounded: repeat(5, restore(1)) } }),
  }),
  petrifiedChestnut: dish('Petrified Chestnut', {
    tags: ['stone'],
    text: 'Battle Start: If your health is full, gain 6 thorns and 6 armor',
    effect: () => ({ hooks: { battleStart: when(healthFull, seq(gainStatus('thorns', 6), gain('armor', 6))) } }),
  }),
  spikedWine: dish('Spiked Wine', {
    tags: ['sanguine'],
    text: 'Wounded: Restore 5 health and gain 5 thorns',
    effect: () => ({ hooks: { wounded: seq(restore(5), gainStatus('thorns', 5)) } }),
  }),
  bloodySteak: dish('Bloody Steak', {
    tags: ['sanguine', 'stone'],
    text: 'Wounded: Restore 10 health and gain 5 armor',
    effect: () => ({ hooks: { wounded: seq(restore(10), gain('armor', 5)) } }),
  }),
} as const

export const CRAFTED_ITEMS: readonly ItemDef[] = [HONEYCOMB, ...Object.values(DISHES)]

const recipe = (a: string, b: string, result: ItemDef): Recipe => ({ a, b, result })

export const RECIPES: readonly Recipe[] = [
  recipe('cherry-bomb', 'honeycomb', DISHES.sugarBomb),
  recipe('cherry-bomb', 'redwood-roast', DISHES.explosiveRoast),
  recipe('cherry-bomb', 'spiny-chestnut', DISHES.trailMix),
  recipe('cherry-bomb', 'stone-steak', DISHES.graniteCherry),
  recipe('cherry-bomb', 'vampiric-wine', DISHES.cherryCocktail),
  recipe('honeycomb', 'redwood-roast', DISHES.honeyHam),
  recipe('honeycomb', 'spiny-chestnut', DISHES.candiedNuts),
  recipe('honeycomb', 'stone-steak', DISHES.rockCandy),
  recipe('honeycomb', 'vampiric-wine', DISHES.sweetWine),
  recipe('redwood-roast', 'spiny-chestnut', DISHES.roastedChestnut),
  recipe('redwood-roast', 'stone-steak', DISHES.rockRoast),
  recipe('redwood-roast', 'vampiric-wine', DISHES.bloodSausage),
  recipe('spiny-chestnut', 'stone-steak', DISHES.petrifiedChestnut),
  recipe('spiny-chestnut', 'vampiric-wine', DISHES.spikedWine),
  recipe('stone-steak', 'vampiric-wine', DISHES.bloodySteak),
]

export const MERGED_WEAPONS = {
  boomSpear: weapon('Boom Spear', {
    rarity: 'heroic',
    stats: { attack: 1 },
    text: 'On Hit: Gain 2 thorns and deal 2 damage',
    effect: () => ({ hooks: { onHit: seq(gainStatus('thorns', 2), damageEnemy(2)) } }),
    drop: false,
  }),
  brittlebarkBlade: weapon('Brittlebark Blade', {
    rarity: 'heroic',
    stats: { attack: 12 },
    tags: ['wood'],
    text: 'On Hit: Lose 2 attack',
    effect: () => ({ hooks: { onHit: gain('attack', -2) } }),
    drop: false,
  }),
} as const

export const MERGES: readonly Recipe[] = [
  recipe('boom-stick', 'razorthorn-spear', MERGED_WEAPONS.boomSpear),
  recipe('brittlebark-club', 'brittlebark-bow', MERGED_WEAPONS.brittlebarkBlade),
]

