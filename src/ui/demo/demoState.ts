import { simulateBattle } from '../../core/combat/simulate'
import { buildPlayer, creatureCombatant, type Loadout } from '../../core/items/loadout'
import { sightRadius, timeOfWeek } from '../../core/world/clock'
import { revealAround } from '../../core/world/fog'
import { ENEMIES_BY_ID, enemyAt } from '../../data/enemies'
import type { BattleView } from '../combat/CombatView'
import type { DemoMap } from './demoMap'

/** Walk-and-fight state for the demo. Superseded by core/run/reducer in Phase 3. */
export interface DemoState {
  readonly player: { readonly x: number; readonly y: number }
  readonly step: number
  readonly revealed: ReadonlySet<string>
  readonly hp: number
  readonly gold: number
  /** Indexes into map.pois of enemies already beaten. */
  readonly defeated: ReadonlySet<number>
  readonly battle: (BattleView & { readonly poiIndex: number }) | null
  readonly gameOver: boolean
}

export type DemoAction =
  | { readonly type: 'move'; readonly dx: number; readonly dy: number }
  | { readonly type: 'finishBattle' }
  | { readonly type: 'restart' }

const ENEMY_GOLD = 1

export const initDemoState = (map: DemoMap, loadout: Loadout): DemoState => ({
  player: map.start,
  step: 0,
  revealed: revealAround(new Set(), map.start.x, map.start.y, sightRadius('day')),
  hp: buildPlayer(loadout).stats.maxHp,
  gold: loadout.gold ?? 0,
  defeated: new Set(),
  battle: null,
  gameOver: false,
})

const clamp = (value: number, max: number): number => Math.min(max, Math.max(0, value))

const startBattle = (map: DemoMap, loadout: Loadout, state: DemoState): DemoState['battle'] => {
  const poiIndex = map.pois.findIndex(
    (p, i) => p.kind === 'enemy' && p.x === state.player.x && p.y === state.player.y && !state.defeated.has(i),
  )
  const enemyId = map.pois[poiIndex]?.enemyId
  const def = enemyId ? ENEMIES_BY_ID[enemyId] : undefined
  if (!def) return null
  const creature = enemyAt(def, 1)
  const result = simulateBattle(buildPlayer({ ...loadout, hp: state.hp, gold: state.gold }), creatureCombatant(creature))
  return { id: `${state.step}:${poiIndex}`, poiIndex, result, enemyName: creature.name, enemyText: creature.text, goldReward: ENEMY_GOLD }
}

const move = (map: DemoMap, loadout: Loadout, state: DemoState, dx: number, dy: number): DemoState => {
  if (state.battle || state.gameOver) return state
  const player = { x: clamp(state.player.x + dx, map.width - 1), y: clamp(state.player.y + dy, map.height - 1) }
  const step = state.step + 1
  const moved = { ...state, player, step, revealed: revealAround(state.revealed, player.x, player.y, sightRadius(timeOfWeek(step).phase)) }
  return { ...moved, battle: startBattle(map, loadout, moved) }
}

const finishBattle = (state: DemoState): DemoState => {
  const { battle } = state
  if (!battle) return state
  const hero = battle.result.final.player
  if (battle.result.winner !== 'player') return { ...state, battle: null, gameOver: true, hp: Math.max(0, hero.hp) }
  return {
    ...state,
    battle: null,
    hp: hero.hp,
    gold: hero.gold + battle.goldReward,
    defeated: new Set([...state.defeated, battle.poiIndex]),
  }
}

export const demoReducer =
  (map: DemoMap, loadout: Loadout) =>
  (state: DemoState, action: DemoAction): DemoState => {
    switch (action.type) {
      case 'move':
        return move(map, loadout, state, action.dx, action.dy)
      case 'finishBattle':
        return finishBattle(state)
      case 'restart':
        return state.battle ? state : initDemoState(map, loadout)
    }
  }
