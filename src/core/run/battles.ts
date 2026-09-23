/** Turning map encounters into simulated battles, and applying their outcome. */
import { simulateBattle } from '../combat/simulate'
import { creatureCombatant } from '../items/loadout'
import type { BossDef, CreatureDef } from '../items/types'
import type { EnemyEntity } from '../world/types'
import { addSlots, heroCombatant, heroMaxHp, withHealth } from './hero'
import type { BattleInfo, Content, RunState, Week } from './types'

const ENEMY_GOLD = 1
const BOSS_GOLD = 0
const SLOTS_PER_BOSS = 2

const battleScreen = (state: RunState, content: Content, creature: CreatureDef, source: BattleInfo['source'], boss: boolean): RunState => {
  const result = simulateBattle(heroCombatant(state.hero, content.sets), creatureCombatant(creature))
  const tag = source.kind === 'enemy' ? source.entityId : 'boss'
  const battle: BattleInfo = {
    id: `w${state.week}-s${state.step}-${tag}`,
    result,
    enemyName: creature.name,
    enemyText: creature.text,
    boss,
    goldReward: boss ? BOSS_GOLD : ENEMY_GOLD,
    source,
  }
  return { ...state, screen: { kind: 'battle', battle } }
}

export const startEnemyBattle = (state: RunState, content: Content, entity: EnemyEntity): RunState => {
  const def = content.enemies[entity.enemyId]
  if (!def) throw new Error(`run: unknown enemy "${entity.enemyId}"`)
  const creature = def.levels[state.week - 1] as CreatureDef
  return battleScreen(state, content, creature, { kind: 'enemy', entityId: entity.id }, false)
}

const bossById = (content: Content, id: string | undefined): BossDef => {
  const boss = content.bosses.find((b) => b.id === id)
  if (!boss) throw new Error(`run: unknown boss "${id}"`)
  return boss
}

/** Fights this week's boss, or a specific one (a boss's second form). */
export const startBossBattle = (state: RunState, content: Content, bossId: string = state.bosses[state.week - 1] as string): RunState => {
  const boss = bossById(content, bossId)
  return battleScreen(state, content, boss, { kind: 'boss', bossId: boss.id }, true)
}

/** Applies the battle on screen: defeat ends the run; beating a boss advances the week (or brings its next form). */
export const finishBattle = (state: RunState, content: Content): RunState => {
  if (state.screen.kind !== 'battle') return state
  const { battle } = state.screen
  const final = battle.result.final.player
  if (battle.result.winner !== 'player') return { ...state, hero: { ...state.hero, hp: 0 }, screen: { kind: 'gameOver' } }

  const hero = withHealth({ ...state.hero, gold: final.gold + battle.goldReward }, final.hp)
  if (battle.source.kind === 'enemy') {
    const { entityId } = battle.source
    const enemies = state.world.enemies.map((e) => (e.id === entityId ? { ...e, alive: false } : e))
    return { ...state, hero, world: { ...state.world, enemies }, screen: { kind: 'map' } }
  }

  const next = bossById(content, battle.source.bossId).next
  if (next) return startBossBattle({ ...state, hero: withHealth(hero, heroMaxHp(hero, content.sets)) }, content, next)
  if (state.week === 3) return { ...state, hero, screen: { kind: 'victory' } }
  const week = (state.week + 1) as Week
  return {
    ...state,
    hero: addSlots(hero, SLOTS_PER_BOSS),
    week,
    step: 0,
    screen: {
      kind: 'message',
      title: `Week ${week}`,
      text: `${battle.enemyName} is defeated. You gain ${SLOTS_PER_BOSS} item slots. Enemies grow stronger — he is still coming.`,
    },
  }
}
