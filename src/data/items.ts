/** Woodland items, jewelry and food (wiki, Jul 2025 — docs/research/content.md). */
import {
  additionalStrikes,
  belowHalfHealth,
  bombDamage,
  damageEnemy,
  enemyHasArmor,
  enemyStat,
  everyOtherTurn,
  extraExposed,
  earnGold,
  fasterThanEnemy,
  firstTurn,
  gain,
  gainStatus,
  giveEnemy,
  hasArmor,
  hasSpeed,
  healthFull,
  missingHealth,
  myBase,
  not,
  payloadAmount,
  restore,
  seq,
  stealArmor,
  takeDamage,
  when,
  whileBonus,
  zeroBaseArmor,
} from '../core/effects/dsl'
import type { ItemDef } from '../core/items/types'
import { byId, item } from './define'
import { CRAFTED_ITEMS } from './crafting'
import { MORE_ITEMS } from './moreItems'

const ARMOR_ITEMS: readonly ItemDef[] = [
  item('Horned Helmet', {
    rarity: 'common',
    stats: { armor: 2 },
    text: 'Battle Start: Gain {1} thorns',
    effect: (x) => ({ hooks: { battleStart: gainStatus('thorns', x(1)) } }),
  }),
  item('Iceblock Shield', {
    rarity: 'common',
    stats: { armor: 4 },
    tags: ['water'],
    text: 'Battle Start: Gain {2} freeze',
    effect: (x) => ({ hooks: { battleStart: gainStatus('freeze', x(2)) } }),
  }),
  item('Redwood Cloak', {
    rarity: 'common',
    stats: { health: 2 },
    tags: ['wood'],
    text: 'Battle Start: If your health is not full, restore {2} health',
    effect: (x) => ({ hooks: { battleStart: when(not(healthFull), restore(x(2))) } }),
  }),
  item('Redwood Helmet', {
    rarity: 'common',
    stats: { health: 1, armor: 1 },
    tags: ['wood'],
    text: 'Exposed: Restore {3} health',
    effect: (x) => ({ hooks: { exposed: restore(x(3)) } }),
  }),
  item('Lifeblood Helmet', {
    rarity: 'common',
    text: 'First Turn: Restore health equal to damage dealt by strikes',
    effect: () => ({ hooks: { onHit: when(firstTurn, restore(payloadAmount)) } }),
  }),
  item('Double-plated Armor', {
    rarity: 'common',
    stats: { armor: 2, speed: -2 },
    text: 'Exposed: Gain {3} armor',
    effect: (x) => ({ hooks: { exposed: gain('armor', x(3)) } }),
  }),
  item('Swiftstrike Belt', {
    rarity: 'common',
    text: 'Battle Start: Take {3} damage and gain 1 additional strike',
    effect: (x) => ({ hooks: { battleStart: seq(takeDamage(x(3)), additionalStrikes(1)) } }),
  }),
  item('Frostbite Gauntlet', {
    rarity: 'common',
    tags: ['water'],
    text: 'Battle Start: Give the enemy {1} freeze',
    effect: (x) => ({ hooks: { battleStart: giveEnemy('freeze', x(1)) } }),
  }),
  item('Frostbite Trap', {
    rarity: 'common',
    tags: ['water'],
    text: 'Wounded: Give the enemy {3} freeze',
    effect: (x) => ({ hooks: { wounded: giveEnemy('freeze', x(3)) } }),
  }),
  item('Saffron Feather', {
    rarity: 'common',
    stats: { speed: 1 },
    text: 'Turn Start: Convert 1 speed to restore {2} health',
    effect: (x) => ({ hooks: { turnStart: when(hasSpeed(1), seq(gain('speed', -1), restore(x(2)))) } }),
  }),
  item('Cracked Whetstone', {
    rarity: 'common',
    tags: ['stone'],
    text: 'First Turn: Temporarily gain {2} attack',
    effect: (x) => ({ attackBonus: whileBonus(firstTurn, x(2)) }),
  }),
  item('Leather Glove', { rarity: 'common', stats: { health: 3, speed: 1 } }),
  item('Leather Vest', { rarity: 'common', stats: { armor: 2, speed: 1 } }),
  item('Boots of the Hero', { rarity: 'common', stats: { speed: 2 } }),
  item('Shield of the Hero', { rarity: 'common', stats: { armor: 3 } }),
  item('Leather Boots', {
    rarity: 'rare',
    text: 'Battle Start: If you have more speed than the enemy, gain 2 attack',
    effect: () => ({ hooks: { battleStart: when(fasterThanEnemy, gain('attack', 2)) } }),
  }),
  item('Cracked Bouldershield', {
    rarity: 'rare',
    tags: ['stone'],
    text: 'Exposed: Gain 7 armor',
    effect: () => ({ hooks: { exposed: gain('armor', 7) } }),
  }),
  item('Thorn Ring', {
    rarity: 'rare',
    tags: ['ring', 'jewelry'],
    text: 'Battle Start: Take 5 damage and gain 10 thorns',
    effect: () => ({ hooks: { battleStart: seq(takeDamage(5), gainStatus('thorns', 10)) } }),
  }),
  item('Blacksmith Bond', {
    rarity: 'rare',
    text: 'Exposed can trigger 1 additional time',
    effect: () => ({ hooks: { battleStart: extraExposed(1) } }),
  }),
  item('Blastcap Armor', {
    rarity: 'rare',
    stats: { armor: 8 },
    text: 'Exposed: Take 5 damage',
    effect: () => ({ hooks: { exposed: takeDamage(5) } }),
  }),
  item('Explosive Surprise', {
    rarity: 'rare',
    tags: ['bomb'],
    text: 'Exposed: Deal 6 damage',
    effect: () => ({ hooks: { exposed: bombDamage(6) } }),
  }),
  item('Iron Shrapnel', {
    rarity: 'rare',
    tags: ['bomb'],
    text: "Battle start: Deal 3 damage to the enemy, if they don't have armor, double the damage dealt",
    effect: () => ({ hooks: { battleStart: (s, ctx) => bombDamage(enemyHasArmor(s, ctx.self) ? 3 : 6)(s, ctx) } }),
  }),
  item('Heart-shaped Acorn', {
    rarity: 'rare',
    tags: ['wood'],
    text: 'Battle Start: If you have 0 base armor, restore health to full',
    effect: () => ({ hooks: { battleStart: when(zeroBaseArmor, restore(missingHealth)) } }),
  }),
  item('Ironstone Sandals', {
    rarity: 'rare',
    stats: { speed: -1 },
    tags: ['stone'],
    text: 'While you have armor, temporarily gain 3 attack',
    effect: () => ({ attackBonus: whileBonus(hasArmor, 3) }),
  }),
  item('Ironstone Bracelet', {
    rarity: 'common',
    stats: { speed: -1 },
    tags: ['stone'],
    text: 'Enemy strikes deal 1 damage less while you have armor but 1 damage more otherwise',
    effect: () => ({
      incomingDamage: (s, self, amount, isStrike) => (!isStrike ? amount : s.fighters[self].armor > 0 ? amount - 1 : amount + 1),
    }),
  }),
  item('Fortified Gauntlet', {
    rarity: 'rare',
    text: 'Turn Start: If you have armor, gain 1 additional armor',
    effect: () => ({ hooks: { turnStart: when(hasArmor, gain('armor', 1)) } }),
  }),
  item('Blackbriar Armor', {
    rarity: 'heroic',
    stats: { attack: -1 },
    text: 'Whenever you take damage, gain 2 thorns',
    effect: () => ({ hooks: { onDamaged: gainStatus('thorns', 2) } }),
  }),
  item('Ironstone Armor', {
    rarity: 'heroic',
    stats: { speed: -2 },
    tags: ['stone'],
    text: 'Enemy strikes deal 2 damage less while you have armor',
    effect: () => ({ incomingDamage: (s, self, amount, isStrike) => (isStrike && s.fighters[self].armor > 0 ? amount - 2 : amount) }),
  }),
  item('Moonlight Shield', {
    rarity: 'heroic',
    text: "Turn Start: If you're below 50% health, gain 2 armor",
    effect: () => ({ hooks: { turnStart: when(belowHalfHealth, gain('armor', 2)) } }),
  }),
  item('Studded Gauntlet', {
    rarity: 'heroic',
    text: 'On Hit: Deal 1 damage',
    effect: () => ({ hooks: { onHit: damageEnemy(1) } }),
  }),
  item('Assault Greaves', {
    rarity: 'heroic',
    text: 'Whenever you take damage, deal 1 damage',
    effect: () => ({ hooks: { onDamaged: damageEnemy(1) } }),
  }),
  item('Crimson Cloak', {
    rarity: 'heroic',
    tags: ['sanguine'],
    text: 'Whenever you take damage, restore 1 health',
    effect: () => ({ hooks: { onDamaged: restore(1) } }),
  }),
  item('Swiftstrike Gauntlet', {
    rarity: 'heroic',
    text: 'Wounded: Gain 2 additional strikes',
    effect: () => ({ hooks: { wounded: additionalStrikes(2) } }),
  }),
  item('Chainmail Armor', {
    rarity: 'heroic',
    text: 'Wounded: Regain your base armor',
    effect: () => ({ hooks: { wounded: gain('armor', myBase('armor')) } }),
  }),
  item('Razor Breastplate', {
    rarity: 'heroic',
    stats: { armor: 3 },
    text: 'Wounded: Gain thorns equal to enemy attack',
    effect: () => ({ hooks: { wounded: gainStatus('thorns', enemyStat('attack')) } }),
  }),
  item('Elderwood Necklace', { rarity: 'heroic', stats: { attack: 1, armor: 1, speed: 1 }, tags: ['wood'] }),
]

const JEWELRY: readonly ItemDef[] = [
  item('Citrine Earring', {
    rarity: 'common',
    tags: ['jewelry'],
    text: 'Gain {1} speed every other turn',
    effect: (x) => ({ hooks: { turnStart: when(everyOtherTurn, gain('speed', x(1))) } }),
  }),
  item('Emerald Earring', {
    rarity: 'common',
    tags: ['jewelry'],
    text: 'Restore {1} health every other turn',
    effect: (x) => ({ hooks: { turnStart: when(everyOtherTurn, restore(x(1))) } }),
  }),
  item('Ruby Earring', {
    rarity: 'common',
    tags: ['jewelry'],
    text: 'Deal {1} damage every other turn',
    effect: (x) => ({ hooks: { turnStart: when(everyOtherTurn, damageEnemy(x(1))) } }),
  }),
  item('Sapphire Earring', {
    rarity: 'common',
    tags: ['jewelry'],
    text: 'Gain {1} armor every other turn',
    effect: (x) => ({ hooks: { turnStart: when(everyOtherTurn, gain('armor', x(1))) } }),
  }),
  item('Emerald Crown', { rarity: 'common', tags: ['jewelry'], stats: { health: 8, attack: -1 }, text: 'Gain {8} health and lose {1} attack' }),
  item('Ruby Crown', { rarity: 'common', tags: ['jewelry'], stats: { attack: 1, speed: -1 }, text: 'Gain {1} attack and lose {1} speed' }),
  item('Sapphire Crown', { rarity: 'common', tags: ['jewelry'], stats: { armor: 5, health: -2 }, text: 'Gain {5} armor and lose {2} health' }),
  item('Emerald Ring', {
    rarity: 'common',
    tags: ['jewelry', 'ring'],
    text: 'Battle Start: Restore {3} health',
    effect: (x) => ({ hooks: { battleStart: restore(x(3)) } }),
  }),
  item('Ruby Ring', {
    rarity: 'common',
    tags: ['jewelry', 'ring'],
    text: 'Battle Start: Gain {2} attack and take {3} damage',
    effect: (x) => ({ hooks: { battleStart: seq(gain('attack', x(2)), takeDamage(x(3))) } }),
  }),
  item('Sapphire Ring', {
    rarity: 'common',
    tags: ['jewelry', 'ring'],
    text: 'Battle Start: Steal {2} armor from the enemy',
    effect: (x) => ({ hooks: { battleStart: stealArmor(x(2)) } }),
  }),
  item('Gold Ring', {
    rarity: 'rare',
    tags: ['jewelry', 'ring'],
    text: 'Battle Start: Gain 1 gold',
    effect: () => ({ hooks: { battleStart: earnGold(1) } }),
  }),
]

const FOOD: readonly ItemDef[] = [
  item('Spiny Chestnut', {
    rarity: 'common',
    tags: ['food'],
    text: 'Battle Start: Gain {3} thorns',
    effect: (x) => ({ hooks: { battleStart: gainStatus('thorns', x(3)) } }),
  }),
  item('Redwood Roast', { rarity: 'common', tags: ['food', 'wood'], stats: { health: 5 }, text: 'Gain {5} health' }),
  item('Vampiric Wine', {
    rarity: 'common',
    tags: ['food', 'sanguine'],
    text: 'Wounded: Restore {4} health',
    effect: (x) => ({ hooks: { wounded: restore(x(4)) } }),
  }),
  item('Stone Steak', {
    rarity: 'rare',
    tags: ['food', 'stone'],
    text: 'Battle Start: If your health is full, gain 5 armor',
    effect: () => ({ hooks: { battleStart: when(healthFull, gain('armor', 5)) } }),
  }),
]

export const ITEMS: readonly ItemDef[] = [...ARMOR_ITEMS, ...JEWELRY, ...FOOD, ...MORE_ITEMS, ...CRAFTED_ITEMS]

export const ITEMS_BY_ID = byId(ITEMS)
