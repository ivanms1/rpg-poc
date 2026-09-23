/** Woodland bosses (wiki — docs/research/content.md). Week 2 pool and Leshen arrive with the run loop. */
import { enemyBelowHalfHealth, enemyStat, fasterThanEnemy, gain, plus, whileBonus } from '../core/effects/dsl'
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
]

export const BOSSES_BY_ID = byId(BOSSES)
