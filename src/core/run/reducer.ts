/** The run reducer: the only way run state changes. */
import { tileKey, inSight, revealAround } from '../world/fog'
import { sightRadius, timeOfWeek } from '../world/clock'
import { generateWorld } from '../world/mapgen'
import { stepToward } from '../world/pathing'
import { isWalkable } from '../world/terrain'
import type { EnemyEntity, Point, World } from '../world/types'
import { createRng } from '../rng'
import { finishBattle, startBossBattle, startEnemyBattle } from './battles'
import { discardItem } from './hero'
import { chooseOption, interact } from './locations'
import { drawDistinct } from './loot'
import type { Content, Hero, RunAction, RunState } from './types'

export const NORMAL_BASE_HEALTH = 20
const STARTING_SLOTS = 4

export interface RunOptions {
  readonly world?: World
  readonly baseHealth?: number
}

const pickBosses = (state: Pick<RunState, 'rng'>, content: Content): [RunState['bosses'], RunState['rng']] => {
  const [firstWeek, rng1] = drawDistinct(state.rng, content.bosses.filter((b) => b.week === 1), 1)
  const rest = content.bosses.filter((b) => b.id !== firstWeek[0]?.id)
  const [later, rng2] = drawDistinct(rng1, rest, 2)
  const ids = [...firstWeek, ...later].map((b) => b.id)
  if (ids.length < 3) throw new Error('run: need at least 3 bosses')
  return [[ids[0]!, ids[1]!, ids[2]!], rng2]
}

export const createRun = (seed: number, content: Content, opts: RunOptions = {}): RunState => {
  const world = opts.world ?? generateWorld(seed)
  const baseHealth = opts.baseHealth ?? NORMAL_BASE_HEALTH
  const [bosses, rng] = pickBosses({ rng: createRng(seed ^ 0x5eed) }, content)
  const hero: Hero = {
    hp: baseHealth,
    gold: 0,
    weapon: { item: content.startingWeapon },
    items: Array.from({ length: STARTING_SLOTS }, () => null),
    baseHealth,
  }
  return {
    seed,
    rng,
    world,
    player: world.start,
    week: 1,
    step: 0,
    revealed: revealAround(new Set(), world.start.x, world.start.y, sightRadius('day')),
    hero,
    bosses,
    screen: { kind: 'map' },
  }
}

const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y

const reveal = (state: RunState): RunState => ({
  ...state,
  revealed: revealAround(state.revealed, state.player.x, state.player.y, sightRadius(timeOfWeek(state.step).phase)),
})

const bossIfDue = (state: RunState, content: Content): RunState =>
  state.screen.kind === 'map' && timeOfWeek(state.step).bossDue ? startBossBattle(state, content) : state

/** At night, enemies that see the hero step toward them; the first to arrive starts a battle. */
const nightChase = (state: RunState, content: Content): RunState => {
  if (timeOfWeek(state.step).phase !== 'night') return state
  const radius = sightRadius('night')
  const blockedByPois = state.world.pois.map((p) => tileKey(p.x, p.y))
  let enemies: readonly EnemyEntity[] = state.world.enemies
  for (const e of state.world.enemies) {
    if (!e.alive || !inSight(e.x - state.player.x, e.y - state.player.y, radius)) continue
    const occupied = new Set([...blockedByPois, ...enemies.filter((o) => o.alive && o.id !== e.id).map((o) => tileKey(o.x, o.y))])
    const next = stepToward(state.world.map, e, state.player, occupied)
    const moved = { ...e, ...next }
    enemies = enemies.map((o) => (o.id === e.id ? moved : o))
    if (same(moved, state.player)) return startEnemyBattle({ ...state, world: { ...state.world, enemies } }, content, moved)
  }
  return { ...state, world: { ...state.world, enemies } }
}

const move = (state: RunState, content: Content, dx: number, dy: number): RunState => {
  if (state.screen.kind !== 'map') return state
  const target = { x: state.player.x + dx, y: state.player.y + dy }
  if (!isWalkable(state.world.map, target.x, target.y)) return state

  const moved = reveal({ ...state, player: target, step: state.step + 1 })
  const foe = moved.world.enemies.find((e) => e.alive && same(e, target))
  if (foe) return startEnemyBattle(moved, content, foe)
  const poi = moved.world.pois.find((p) => same(p, target))
  const visited = poi ? interact(moved, content, poi) : moved
  if (visited.screen.kind !== 'map') return visited
  return bossIfDue(nightChase(visited, content), content)
}

const dismiss = (state: RunState, content: Content): RunState => {
  if (state.screen.kind !== 'choice' && state.screen.kind !== 'message') return state
  return bossIfDue(reveal({ ...state, screen: { kind: 'map' } }), content)
}

const discard = (state: RunState, slot: number): RunState => {
  if (state.screen.kind !== 'map' && state.screen.kind !== 'choice') return state
  const hero = discardItem(state.hero, slot)
  if (hero === state.hero) return state
  const screen = state.screen.kind === 'choice' ? { ...state.screen, notice: undefined } : state.screen
  return { ...state, hero, screen }
}

export const runReducer =
  (content: Content) =>
  (state: RunState, action: RunAction): RunState => {
    switch (action.type) {
      case 'move':
        return move(state, content, action.dx, action.dy)
      case 'finishBattle':
        return bossIfDue(finishBattle(state), content)
      case 'choose':
        return bossIfDue(chooseOption(state, action.index), content)
      case 'dismiss':
        return dismiss(state, content)
      case 'discard':
        return discard(state, action.slot)
      case 'fightBoss':
        return state.screen.kind === 'map' ? startBossBattle(state, content) : state
    }
  }
