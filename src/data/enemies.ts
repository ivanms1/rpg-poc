/** Woodland regular enemies, levels 1–3 = weeks 1–3 (wiki — docs/research/content.md). */
import {
  damageEnemy,
  enemyHasArmor,
  enemyHealthAtMost,
  everyNthStrike,
  fasterThanEnemy,
  gainStatus,
  restore,
  stealEnemyGold,
  when,
  whileBonus,
} from '../core/effects/dsl'
import type { CreatureDef, EnemyDef, SourceSpec } from '../core/items/types'
import type { BaseStats } from '../core/combat/types'
import { byId, slug } from './define'

type Level = 1 | 2 | 3
type Row = readonly [maxHp: number, attack: number, armor: number, speed: number]

const toStats = ([maxHp, attack, armor, speed]: Row): BaseStats => ({ maxHp, attack, armor, speed })

const enemy = (
  name: string,
  rows: readonly [Row, Row, Row],
  values: readonly [number, number, number],
  text: (n: number) => string,
  trait: (n: number) => SourceSpec,
): EnemyDef => {
  const level = (i: 0 | 1 | 2): CreatureDef => {
    const n = values[i]
    return { id: `${slug(name)}-${i + 1}`, name, stats: toStats(rows[i]), text: text(n), trait: trait(n) }
  }
  return { id: slug(name), name, levels: [level(0), level(1), level(2)] }
}

export const ENEMIES: readonly EnemyDef[] = [
  enemy(
    'Bear',
    [[3, 1, 2, 0], [5, 2, 3, 1], [7, 3, 4, 2]],
    [3, 4, 5],
    (n) => `Bear gains ${n} additional attack while the player has armor`,
    (n) => ({ attackBonus: whileBonus(enemyHasArmor, n) }),
  ),
  enemy(
    'Spider',
    [[2, 1, 0, 2], [3, 1, 0, 3], [4, 1, 0, 4]],
    [3, 4, 5],
    (n) => `Battle Start: If Spider has more speed than the player, it deals ${n} damage`,
    (n) => ({ hooks: { battleStart: when(fasterThanEnemy, damageEnemy(n)) } }),
  ),
  enemy(
    'Wolf',
    [[3, 1, 0, 1], [6, 2, 0, 2], [9, 2, 0, 3]],
    [2, 3, 4],
    (n) => `Wolf gains ${n} additional attack while the player has 5 or less health`,
    (n) => ({ attackBonus: whileBonus(enemyHealthAtMost(5), n) }),
  ),
  enemy(
    'Bat',
    [[4, 1, 0, 2], [6, 2, 0, 3], [8, 3, 0, 4]],
    [1, 2, 3],
    (n) => `Every other strike Bat gains ${n} health on hit`,
    (n) => ({ hooks: { onHit: when(everyNthStrike(2), restore(n)) } }),
  ),
  enemy(
    'Hedgehog',
    [[1, 1, 1, 0], [2, 1, 2, 0], [7, 1, 3, 0]],
    [3, 4, 5],
    (n) => `Battle Start: Hedgehog gains ${n} thorns`,
    (n) => ({ hooks: { battleStart: gainStatus('thorns', n) } }),
  ),
  enemy(
    'Raven',
    [[3, 0, 0, 2], [5, 0, 0, 3], [7, 0, 0, 4]],
    [1, 2, 3],
    (n) => `On hit Raven steals ${n} gold`,
    (n) => ({ hooks: { onHit: stealEnemyGold(n) } }),
  ),
]

export const ENEMIES_BY_ID = byId(ENEMIES)

export const enemyAt = (def: EnemyDef, level: Level): CreatureDef => def.levels[level - 1] as CreatureDef
