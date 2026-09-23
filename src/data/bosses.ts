/** Woodland bosses (wiki — docs/research/content.md): a week 1 pool, a week 2 pool and the Leshen finale. */
import {
  enemyBelowHalfHealth,
  enemyHasArmor,
  enemyStat,
  everyOtherTurn,
  fasterThanEnemy,
  gain,
  gainStatus,
  giveEnemy,
  not,
  plus,
  restore,
  seq,
  stealEnemyGold,
  whileBonus,
} from '../core/effects/dsl'
import type { BossDef } from '../core/items/types'
import { byId } from './define'

export const BOSSES: readonly BossDef[] = [
  {
    id: 'black-knight',
    name: 'Black Knight',
    week: 1,
    stats: { maxHp: 10, attack: 0, armor: 5, speed: 0 },
    text: "Battle Start: Black Knight gains attack equal to the Player's attack plus 2",
    trait: { hooks: { battleStart: gain('attack', plus(enemyStat('attack'), 2)) } },
  },
  {
    id: 'bloodmoon-werewolf',
    name: 'Bloodmoon Werewolf',
    week: 1,
    stats: { maxHp: 20, attack: 3, armor: 0, speed: 1 },
    text: 'While player is below 50% health, Bloodmoon Werewolf has 5 additional attack',
    trait: { attackBonus: whileBonus(enemyBelowHalfHealth, 5) },
  },
  {
    id: 'brittlebark-beast',
    name: 'Brittlebark Beast',
    week: 1,
    stats: { maxHp: 50, attack: 3, armor: 0, speed: 2 },
    text: 'Whenever Brittlebark Beast takes damage, he takes 3 additional damage',
    trait: { incomingDamage: (_s, _self, amount) => (amount > 0 ? amount + 3 : amount) },
  },
  {
    id: 'ironstone-golem',
    name: 'Ironstone Golem',
    week: 1,
    stats: { maxHp: 5, attack: 4, armor: 15, speed: 0 },
    text: 'Exposed: Ironstone Golem loses 3 attack',
    trait: { hooks: { exposed: gain('attack', -3) } },
  },
  {
    id: 'razorclaw-grizzly',
    name: 'Razorclaw Grizzly',
    week: 1,
    stats: { maxHp: 10, attack: 3, armor: 5, speed: 2 },
    text: "Razorclaw Grizzly's attacks ignore armor",
    trait: { ignoreArmor: true },
  },
  {
    id: 'razortusk-hog',
    name: 'Razortusk Hog',
    week: 1,
    stats: { maxHp: 5, attack: 4, armor: 0, speed: 4 },
    text: 'If Razortusk Hog has more speed than you, his first strike deals 10 additional damage',
    trait: { strikeBonus: (s, self, strikeIndex) => (strikeIndex === 1 && fasterThanEnemy(s, self) ? 10 : 0) },
  },

  // ---- Week 2 ----
  {
    id: 'blackbriar-king',
    name: 'Blackbriar King',
    week: 2,
    stats: { maxHp: 50, attack: 0, armor: 0, speed: 0 },
    text: "Can't attack but when taking damage it gains 2 thorns and when wounded gains 4 thorns",
    trait: { canStrike: () => false, hooks: { onDamaged: gainStatus('thorns', 2), wounded: gainStatus('thorns', 4) } },
  },
  {
    id: 'frostbite-druid',
    name: 'Frostbite Druid',
    week: 2,
    stats: { maxHp: 10, attack: 3, armor: 20, speed: 4 },
    text: 'On hit: Give the player 1 freeze',
    trait: { hooks: { onHit: giveEnemy('freeze', 1) } },
  },
  {
    id: 'goldwing-monarch',
    name: 'Goldwing Monarch',
    week: 2,
    stats: { maxHp: 40, attack: 3, armor: 0, speed: 4 },
    text: "Wounded: Steals all the player's gold and restores 2 health per gold stolen",
    trait: {
      hooks: {
        wounded: (s, ctx) => {
          const gold = s.fighters[ctx.self === 'player' ? 'enemy' : 'player'].gold
          return seq(stealEnemyGold(gold), restore(gold * 2))(s, ctx)
        },
      },
    },
  },
  {
    id: 'mountain-troll',
    name: 'Mountain Troll',
    week: 2,
    stats: { maxHp: 20, attack: 10, armor: 10, speed: 0 },
    text: 'Mountain Troll only strikes every other turn',
    trait: { canStrike: (s, self) => everyOtherTurn(s, self) },
  },
  {
    id: 'redwood-treant',
    name: 'Redwood Treant',
    week: 2,
    stats: { maxHp: 25, attack: 3, armor: 15, speed: 0 },
    text: 'Redwood Treant gains 3 attack if the player has no armor',
    trait: { attackBonus: whileBonus(not(enemyHasArmor), 3) },
  },
  {
    id: 'swiftstrike-stag',
    name: 'Swiftstrike Stag',
    week: 2,
    stats: { maxHp: 10, attack: 3, armor: 10, speed: 5 },
    text: 'Swiftstrike Stag strikes 3 times per turn',
    trait: { strikesPerTurn: 3 },
  },

  // ---- Week 3 finale ----
  {
    id: 'leshen',
    name: 'Leshen',
    week: 3,
    stats: { maxHp: 50, attack: 7, armor: 0, speed: 3 },
    text: 'Upon death turns into Woodland Abomination and the player recovers health and armor',
    next: 'woodland-abomination',
  },
  {
    id: 'woodland-abomination',
    name: 'Woodland Abomination',
    week: 3,
    hidden: true,
    stats: { maxHp: 100, attack: 0, armor: 0, speed: 3 },
    text: 'Woodland Abomination gains 1 attack each turn',
    trait: { hooks: { turnStart: gain('attack', 1) } },
  },
]

export const BOSSES_BY_ID = byId(BOSSES)
