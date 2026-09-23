/**
 * The rest of the Woodland items (wiki, Jul 2025 — docs/research/content.md).
 * Not yet here: Kindling Bomb, Powder Keg, Bomb Bag, Twinfuse Knot, Vampire's Tooth
 * (they need bomb retriggers / item-count meta the engine doesn't model yet).
 */
import { opponent } from '../core/combat/state'
import {
  additionalStrikes,
  addTally,
  bombDamage,
  damageEnemy,
  earnGold,
  enemyAdditionalStrikes,
  fasterThanEnemy,
  flag,
  gain,
  gainStatus,
  giveEnemy,
  hasArmor,
  hasArmorAtLeast,
  hasGold,
  hasSpeed,
  hasStatus,
  healthFull,
  ifFlag,
  loseHp,
  missingHealth,
  myBase,
  myStat,
  not,
  once,
  nthThisTurn,
  payloadAmount,
  payloadAtLeast,
  plus,
  repeat,
  restore,
  seq,
  slowerThanEnemy,
  tally,
  triggerOwn,
  when,
} from '../core/effects/dsl'
import type { Cond } from '../core/effects/dsl'
import type { Hook } from '../core/combat/types'
import type { ItemDef } from '../core/items/types'
import { item } from './define'

const enemyFirstStrike: Cond = (s, self) => s.fighters[opponent(self)].strikes === 1

const loseAllArmor: Hook = (s, ctx) => gain('armor', -s.fighters[ctx.self].armor)(s, ctx)

const lifebloodArmor: Hook = (s, ctx) => {
  const half = Math.floor(s.fighters[ctx.self].hp / 2)
  return half > 0 ? seq(loseHp(half), gain('armor', half))(s, ctx) : s
}

const reducedToOne: Cond = (s, self) => s.fighters[self].hp === 1

const THORNS_AND_BRAMBLES: readonly ItemDef[] = [
  item('Blackbriar Gauntlet', {
    rarity: 'rare',
    text: "Gain 2 thorns for each armor removed by the enemy's first strike",
    effect: () => ({ hooks: { onStruck: when(enemyFirstStrike, gainStatus('thorns', (_s, _self, ctx) => 2 * (ctx?.payload.armorLost ?? 0))) } }),
  }),
  item('Blackbriar Rose', {
    rarity: 'rare',
    tags: ['rose'],
    text: 'Whenever you restore health, gain 2 thorns. You can only equip 1 rose',
    effect: () => ({ hooks: { onHeal: gainStatus('thorns', 2) } }),
  }),
  item('Bramble Belt', {
    rarity: 'rare',
    text: 'Battle Start: Gain 1 thorns and give the enemy 1 additional strike',
    effect: () => ({ hooks: { battleStart: seq(gainStatus('thorns', 1), enemyAdditionalStrikes(1)) } }),
  }),
  item('Bramble Buckler', {
    rarity: 'rare',
    stats: { armor: 2 },
    text: 'Turn Start: Convert 1 armor to 2 thorns',
    effect: () => ({ hooks: { turnStart: when(hasArmor, seq(gain('armor', -1), gainStatus('thorns', 2))) } }),
  }),
  item('Bramble Talisman', {
    rarity: 'rare',
    text: 'Whenever you gain thorns, gain 1 armor',
    effect: () => ({ hooks: { onGainThorns: gain('armor', 1) } }),
  }),
  item('Bramble Vest', {
    rarity: 'rare',
    stats: { health: 3 },
    text: 'The first time you lose thorns, restore health equal to thorns lost',
    effect: () => ({ hooks: { onLoseThorns: once(restore(payloadAmount)) } }),
  }),
  item('Pinecone Breastplate', {
    rarity: 'rare',
    tags: ['wood'],
    text: 'Battle Start: If your health is full, gain 1 thorn at turn start for the rest of battle',
    effect: () => ({ hooks: { battleStart: when(healthFull, flag('armed')), turnStart: ifFlag('armed', gainStatus('thorns', 1)) } }),
  }),
  item('Cactus Cap', {
    rarity: 'heroic',
    text: 'If the enemy has no armor, thorns deal double damage',
    effect: () => ({ outgoingDamage: (s, self, amount, kind) => (kind === 'thorns' && s.fighters[opponent(self)].armor === 0 ? amount * 2 : amount) }),
  }),
  item('Granite Thorns', {
    rarity: 'mythic',
    tags: ['stone'],
    text: "You don't lose any thorns on the enemy's first 3 strikes",
    effect: () => ({ keepThornsForStrikes: 3 }),
  }),
]

const FROST: readonly ItemDef[] = [
  item('Ice Spikes', {
    rarity: 'rare',
    tags: ['water'],
    text: 'Turn Start: If you have freeze, gain 5 thorns',
    effect: () => ({ hooks: { turnStart: when(hasStatus('freeze'), gainStatus('thorns', 5)) } }),
  }),
  item('Ice Tomb', {
    rarity: 'rare',
    tags: ['water'],
    text: 'Turn Start: If you have no armor, gain 3 armor and 1 freeze',
    effect: () => ({ hooks: { turnStart: when(not(hasArmor), seq(gain('armor', 3), gainStatus('freeze', 1))) } }),
  }),
  item('Frostbite Curse', {
    rarity: 'rare',
    tags: ['water'],
    text: 'Battle Start: Give yourself and the enemy 5 freeze each',
    effect: () => ({ hooks: { battleStart: seq(gainStatus('freeze', 5), giveEnemy('freeze', 5)) } }),
  }),
  item('Frostbite Armor', {
    rarity: 'rare',
    stats: { armor: 2 },
    tags: ['water'],
    text: "The enemy's first strike deals double damage, afterwards they gain 4 freeze",
    effect: () => ({
      incomingDamage: (s, self, amount, isStrike) => (isStrike && enemyFirstStrike(s, self) ? amount * 2 : amount),
      hooks: { onStruck: when(enemyFirstStrike, giveEnemy('freeze', 4)) },
    }),
  }),
  item('Frostbite Greaves', {
    rarity: 'rare',
    tags: ['water'],
    text: 'Whenever you lose speed, give the enemy 1 freeze',
    effect: () => ({ hooks: { onLoseSpeed: giveEnemy('freeze', 1) } }),
  }),
  item('Cold Resistance', {
    rarity: 'mythic',
    tags: ['water'],
    text: 'Freeze doubles your attack instead of halving it',
    effect: () => ({ freezeDoubles: true }),
  }),
]

const STONE_AND_ARMOR: readonly ItemDef[] = [
  item('Ore Heart', {
    rarity: 'rare',
    tags: ['stone'],
    text: 'Battle Start: Gain 3 armor for each equipped stone item',
    effect: (_x, ctx) => ({ hooks: { battleStart: gain('armor', 3 * ctx.tagCount('stone')) } }),
  }),
  item('Granite Crown', {
    rarity: 'rare',
    tags: ['stone', 'jewelry'],
    text: 'Battle Start: Gain max health equal to your base armor',
    effect: () => ({ hooks: { battleStart: gain('maxHp', myBase('armor')) } }),
  }),
  item('Double-plated Vest', {
    rarity: 'rare',
    text: 'The second time you take damage each turn, gain 2 armor',
    effect: () => ({ hooks: { onDamaged: nthThisTurn(2, gain('armor', 2)) } }),
  }),
  item('Royal Helmet', {
    rarity: 'rare',
    stats: { armor: 1 },
    text: 'Exposed: If you have more than 20 gold, gain 10 armor',
    effect: () => ({ hooks: { exposed: when(hasGold(21), gain('armor', 10)) } }),
  }),
  item('Brittlebark Buckler', {
    rarity: 'rare',
    stats: { armor: 10 },
    tags: ['wood'],
    text: "Lose all your armor after your enemy's first strike",
    effect: () => ({ hooks: { onStruck: when(enemyFirstStrike, loseAllArmor) } }),
  }),
  item('Plated Greaves', {
    rarity: 'rare',
    text: 'Exposed: Convert 3 speed to 9 armor',
    effect: () => ({ hooks: { exposed: when(hasSpeed(3), seq(gain('speed', -3), gain('armor', 9))) } }),
  }),
  item('Shield Talisman', {
    rarity: 'heroic',
    text: 'Whenever you gain armor, gain 1 additional armor',
    effect: () => ({ armorGain: (_s, _self, amount) => amount + 1 }),
  }),
  item('Ironskin Potion', {
    rarity: 'heroic',
    text: 'Battle Start: Gain armor equal to lost health',
    effect: () => ({ hooks: { battleStart: gain('armor', missingHealth) } }),
  }),
  item('Iron Transfusion', {
    rarity: 'heroic',
    text: 'Turn Start: Gain 2 armor and lose 1 health',
    effect: () => ({ hooks: { turnStart: seq(gain('armor', 2), loseHp(1)) } }),
  }),
  item('Royal Shield', {
    rarity: 'heroic',
    text: 'Turn Start: Convert 1 gold to 3 armor',
    effect: () => ({ hooks: { turnStart: when(hasGold(1), seq(earnGold(-1), gain('armor', 3))) } }),
  }),
  item('Brittlebark Armor', {
    rarity: 'heroic',
    stats: { health: 12 },
    tags: ['wood'],
    text: 'Whenever you take damage, take 1 additional damage',
    effect: () => ({ incomingDamage: (_s, _self, amount) => (amount > 0 ? amount + 1 : amount) }),
  }),
  item('Bloodmoon Armor', {
    rarity: 'mythic',
    stats: { armor: 6 },
    tags: ['sanguine'],
    text: 'Whenever you would take damage from your own items, the enemy takes that damage instead',
    effect: () => ({ redirectSelfDamage: true }),
  }),
  item('Razor Scales', {
    rarity: 'mythic',
    text: 'Whenever you lose armor, deal that much damage',
    effect: () => ({ hooks: { onLoseArmor: damageEnemy(payloadAmount) } }),
  }),
]

const SPEED: readonly ItemDef[] = [
  item('Featherweight Wings', {
    rarity: 'rare',
    text: 'Battle Start: If you have less speed than the enemy, gain attack equal to your speed',
    effect: () => ({ hooks: { battleStart: when(slowerThanEnemy, gain('attack', myStat('speed'))) } }),
  }),
  item('Featherweight Armor', {
    rarity: 'rare',
    text: 'Whenever you gain speed, also gain an equal amount of armor',
    effect: () => ({ hooks: { onGainSpeed: gain('armor', payloadAmount) } }),
  }),
  item('Featherweight Greaves', {
    rarity: 'rare',
    text: 'Turn Start: If you have 0 speed, gain 1 speed',
    effect: () => ({ hooks: { turnStart: when((s, self) => s.fighters[self].speed === 0, gain('speed', 1)) } }),
  }),
  item('Featherweight Helmet', {
    rarity: 'rare',
    text: 'Battle start: Spend 2 armor to gain 3 speed and 1 attack',
    effect: () => ({ hooks: { battleStart: when(hasArmorAtLeast(2), seq(gain('armor', -2), gain('speed', 3), gain('attack', 1))) } }),
  }),
  item('Swiftstrike Cloak', {
    rarity: 'heroic',
    stats: { speed: 1 },
    text: 'Battle Start: If you have more speed than the enemy, gain 1 additional strike',
    effect: () => ({ hooks: { battleStart: when(fasterThanEnemy, additionalStrikes(1)) } }),
  }),
]

const BLOOD_AND_HEALING: readonly ItemDef[] = [
  item('Lifeblood Burst', {
    rarity: 'rare',
    tags: ['sanguine'],
    text: 'Whenever you restore 3 or more health, deal 3 damage',
    effect: () => ({ hooks: { onHeal: when(payloadAtLeast(3), damageEnemy(3)) } }),
  }),
  item('Iron Rose', {
    rarity: 'rare',
    tags: ['rose'],
    text: 'Whenever you restore health, gain 1 armor. You can only equip 1 rose',
    effect: () => ({ hooks: { onHeal: gain('armor', 1) } }),
  }),
  item('Sanguine Rose', {
    rarity: 'rare',
    tags: ['rose', 'sanguine'],
    text: 'Whenever you restore health, restore 1 additional health. You can only equip 1 rose',
    effect: () => ({ incomingHeal: (_s, _self, amount) => (amount > 0 ? amount + 1 : amount) }),
  }),
  item('Blood Chain', {
    rarity: 'rare',
    tags: ['sanguine'],
    text: 'The first time the enemy becomes wounded, trigger all of your wounded items',
    effect: () => ({ hooks: { enemyWounded: once(triggerOwn('wounded')) } }),
  }),
  item('Heart-shaped Potion', {
    rarity: 'rare',
    tags: ['sanguine'],
    text: 'When you are reduced to exactly 1 health for the first time, restore health to full',
    effect: () => ({ hooks: { onLoseHealth: when(reducedToOne, once(restore(missingHealth))) } }),
  }),
  item("Druid's Cloak", {
    rarity: 'heroic',
    text: 'Whenever you lose health, gain that much armor. You cannot restore health',
    effect: () => ({ incomingHeal: () => 0, hooks: { onLoseHealth: gain('armor', payloadAmount) } }),
  }),
  item('Lifeblood Armor', {
    rarity: 'heroic',
    tags: ['sanguine'],
    text: 'Battle Start: Convert 50% of your current health to that amount of armor',
    effect: () => ({ hooks: { battleStart: lifebloodArmor } }),
  }),
]

const BOMBS: readonly ItemDef[] = [
  item('Cherry Bomb', {
    rarity: 'common',
    tags: ['food', 'bomb'],
    text: 'Battle Start: Deal {1} damage 2 times',
    effect: (x) => ({ hooks: { battleStart: repeat(2, bombDamage(x(1))) } }),
  }),
  item('Firecracker Belt', {
    rarity: 'rare',
    tags: ['bomb'],
    text: 'Exposed: Deal 1 damage 4 times',
    effect: () => ({ hooks: { exposed: repeat(4, bombDamage(1)) } }),
  }),
  item('Explosive Powder', {
    rarity: 'rare',
    text: 'The damage of all bomb items increases by 1',
    effect: () => ({ outgoingDamage: (_s, _self, amount, kind) => (kind === 'bomb' ? amount + 1 : amount) }),
  }),
  item('Double Explosion', {
    rarity: 'rare',
    text: 'The second time you deal non-weapon damage each turn, deal 3 damage',
    effect: () => ({ hooks: { onDealDamage: nthThisTurn(2, damageEnemy(3)) } }),
  }),
  item('Sword Talisman', {
    rarity: 'heroic',
    text: 'Whenever you deal non-weapon damage to the enemy, deal 1 additional damage',
    effect: () => ({ outgoingDamage: (_s, _self, amount, kind) => (kind === 'strike' ? amount : amount + 1) }),
  }),
  item('Time Bomb', {
    rarity: 'heroic',
    tags: ['bomb'],
    text: 'Exposed: Deal 1 damage. Turn start: This item gains 2 damage',
    effect: () => ({
      hooks: { turnStart: addTally('power', 2), exposed: bombDamage(plus(1, tally('power'))) },
    }),
  }),
]

const MISC: readonly ItemDef[] = [
  item('Loose Change', { rarity: 'common', text: 'Gain {3} gold at the start of every day', goldPerDay: 3 }),
  item('Chainlink Medallion', {
    rarity: 'mythic',
    tags: ['jewelry'],
    text: 'Your On Hit effects trigger twice',
    effect: () => ({ doubleOnHit: true }),
  }),
  item('Oak Heart', {
    rarity: 'rare',
    tags: ['wood'],
    text: 'Gain 3 max health for each equipped wood item',
    baseModifier: (st, ctx) => ({ ...st, maxHp: st.maxHp + 3 * ctx.tagCount('wood') }),
  }),
]

const GEMS: readonly ItemDef[] = [
  item('Citrine Ring', {
    rarity: 'rare',
    tags: ['jewelry', 'ring'],
    text: 'Battle Start: Spend 5 speed to permanently gain 1 additional strike',
    effect: () => ({
      hooks: { battleStart: when(hasSpeed(5), seq(gain('speed', -5), flag('strike'))), turnStart: ifFlag('strike', additionalStrikes(1)) },
    }),
  }),
  item('Citrine Gemstone', {
    rarity: 'heroic',
    tags: ['jewelry'],
    text: 'Your base speed stat is inverted',
    baseModifier: (st) => ({ ...st, speed: -st.speed }),
  }),
  item('Emerald Gemstone', {
    rarity: 'heroic',
    tags: ['jewelry'],
    text: 'Overhealing is dealt as damage',
    effect: () => ({ hooks: { onOverheal: damageEnemy(payloadAmount) } }),
  }),
  item('Ruby Gemstone', {
    rarity: 'heroic',
    tags: ['jewelry'],
    text: 'If your attack is exactly 1, deal 4 damage on hit',
    effect: () => ({ hooks: { onHit: when((s, self) => s.fighters[self].attack === 1, damageEnemy(4)) } }),
  }),
  item('Sapphire Gemstone', {
    rarity: 'heroic',
    tags: ['jewelry'],
    text: 'Whenever you lose armor, restore that much health',
    effect: () => ({ hooks: { onLoseArmor: restore(payloadAmount) } }),
  }),
]

export const MORE_ITEMS: readonly ItemDef[] = [...THORNS_AND_BRAMBLES, ...FROST, ...STONE_AND_ARMOR, ...SPEED, ...BLOOD_AND_HEALING, ...BOMBS, ...MISC, ...GEMS]
