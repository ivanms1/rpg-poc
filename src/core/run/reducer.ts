/** The run reducer: the only way run state changes. */
import { tileKey, inSight, revealAround } from '../world/fog'
import { sightRadius } from '../world/clock'
import { generateWorld } from '../world/mapgen'
import { stepToward } from '../world/pathing'
import { isWalkable } from '../world/terrain'
import type { EnemyEntity, Point, World } from '../world/types'
import { createRng, type Rng } from '../rng'
import { finishBattle, startBossBattle, startEnemyBattle } from './battles'
import { DIFFICULTIES, timeOf, type Difficulty } from './difficulty'
import { discardItem, goldPerDay, swapSlots } from './hero'
import { chooseOption, interact } from './locations'
import { buy, haggle, reroll } from './shop'
import { drawDistinct } from './loot'
import type { Content, Hero, RunAction, RunState, Week } from './types'

const STARTING_SLOTS = 4
const WEEKS: readonly Week[] = [1, 2, 3]

export interface RunOptions {
  readonly world?: World
  readonly difficulty?: Difficulty
  /** Overrides the difficulty's starting health (tests). */
  readonly baseHealth?: number
}

/** One boss per week from that week's pool (falling back to any unused boss if a pool is empty). */
const pickBosses = (rng: Rng, content: Content): [RunState['bosses'], Rng] => {
  const drawable = content.bosses.filter((b) => !b.hidden)
  const [ids, next] = WEEKS.reduce<[string[], Rng]>(
    ([picked, r], week) => {
      const pool = drawable.filter((b) => b.week === week && !picked.includes(b.id))
      const [drawn, r2] = drawDistinct(r, pool.length > 0 ? pool : drawable.filter((b) => !picked.includes(b.id)), 1)
      return [[...picked, ...drawn.map((b) => b.id)], r2]
    },
    [[], rng],
  )
  if (ids.length < 3) throw new Error('run: need at least 3 bosses')
  return [[ids[0]!, ids[1]!, ids[2]!], next]
}

export const createRun = (seed: number, content: Content, opts: RunOptions = {}): RunState => {
  const world = opts.world ?? generateWorld(seed)
  const difficulty = opts.difficulty ?? 'normal'
  const baseHealth = opts.baseHealth ?? DIFFICULTIES[difficulty].baseHealth
  const [bosses, rng] = pickBosses(createRng(seed ^ 0x5eed), content)
  const hero: Hero = {
    hp: baseHealth,
    gold: 0,
    weapon: { item: content.startingWeapon },
    items: Array.from({ length: STARTING_SLOTS }, () => null),
    baseHealth,
    oils: [],
    edge: null,
  }
  return {
    seed,
    difficulty,
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
  revealed: revealAround(state.revealed, state.player.x, state.player.y, sightRadius(timeOf(state).phase)),
})

const bossIfDue = (state: RunState, content: Content): RunState =>
  state.screen.kind === 'map' && timeOf(state).bossDue ? startBossBattle(state, content) : state

/** At night, enemies that see the hero step toward them; the first to arrive starts a battle. */
const nightChase = (state: RunState, content: Content): RunState => {
  if (timeOf(state).phase !== 'night') return state
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

const DIALOGS: ReadonlySet<RunState['screen']['kind']> = new Set(['choice', 'message', 'shop', 'forge', 'oil', 'craft', 'pick'])

const dismiss = (state: RunState, content: Content): RunState => {
  if (!DIALOGS.has(state.screen.kind)) return state
  return bossIfDue(reveal({ ...state, screen: { kind: 'map' } }), content)
}

/** Inventory edits are allowed on the map and while a dialog is open, never mid-battle. */
const canEditInventory = (state: RunState): boolean => state.screen.kind === 'map' || DIALOGS.has(state.screen.kind)

const reorder = (state: RunState, from: number, to: number): RunState => {
  if (!canEditInventory(state)) return state
  const hero = swapSlots(state.hero, from, to)
  return hero === state.hero ? state : { ...state, hero }
}

const discard = (state: RunState, content: Content, slot: number): RunState => {
  if (!canEditInventory(state)) return state
  const hero = discardItem(state.hero, slot, content.sets)
  if (hero === state.hero) return state
  const screen = state.screen.kind === 'choice' || state.screen.kind === 'shop' || state.screen.kind === 'pick' ? { ...state.screen, notice: undefined } : state.screen
  return { ...state, hero, screen }
}

const reduceAction = (content: Content, state: RunState, action: RunAction): RunState => {
  switch (action.type) {
    case 'move':
      return move(state, content, action.dx, action.dy)
    case 'finishBattle':
      return bossIfDue(finishBattle(state, content), content)
    case 'choose':
      return bossIfDue(chooseOption(state, content, action.index), content)
    case 'dismiss':
      return dismiss(state, content)
    case 'discard':
      return discard(state, content, action.slot)
    case 'reorder':
      return reorder(state, action.from, action.to)
    case 'buy':
      return buy(state, content, action.index)
    case 'reroll':
      return reroll(state, content)
    case 'haggle':
      return haggle(state)
    case 'fightBoss':
      return state.screen.kind === 'map' ? startBossBattle(state, content) : state
  }
}

/** Loose Change and friends: gold for every day that started during this action (including a new week). */
const payDailyIncome = (before: RunState, after: RunState): RunState => {
  const income = goldPerDay(after.hero)
  if (income === 0) return after
  const days = after.week > before.week ? 1 : timeOf(after).day - timeOf(before).day
  return days > 0 ? { ...after, hero: { ...after.hero, gold: after.hero.gold + income * days } } : after
}

export const runReducer =
  (content: Content) =>
  (state: RunState, action: RunAction): RunState =>
    payDailyIncome(state, reduceAction(content, state, action))
