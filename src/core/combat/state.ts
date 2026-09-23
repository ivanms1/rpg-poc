import { DEFAULT_RULES, type Rules } from '../rules'
import {
  STATUS_NAMES,
  type BattleEventBody,
  type BattleState,
  type Combatant,
  type FighterState,
  type FighterVisible,
  type Side,
  type Source,
  type Statuses,
} from './types'

export const opponent = (side: Side): Side => (side === 'player' ? 'enemy' : 'player')

export const EMPTY_STATUSES: Statuses = Object.fromEntries(STATUS_NAMES.map((name) => [name, 0])) as Record<
  (typeof STATUS_NAMES)[number],
  number
>

const SOURCE_ORDER: Record<Source['kind'], number> = { trait: 0, weapon: 1, edge: 2, item: 3, set: 4 }

/** Trigger order: creature trait → weapon → weapon edge → items in slot order → set bonuses. */
export const orderSources = (sources: readonly Source[]): readonly Source[] =>
  sources
    .map((source, index) => ({ source, index }))
    .sort((a, b) => SOURCE_ORDER[a.source.kind] - SOURCE_ORDER[b.source.kind] || a.index - b.index)
    .map(({ source }) => source)

export const createFighter = (side: Side, c: Combatant): FighterState => {
  if (c.stats.maxHp <= 0) throw new RangeError(`${c.name}: maxHp must be positive`)
  const hp = Math.min(c.hp ?? c.stats.maxHp, c.stats.maxHp)
  if (hp <= 0) throw new RangeError(`${c.name}: cannot start a battle with ${hp} health`)
  return {
    side,
    name: c.name,
    hp,
    maxHp: c.stats.maxHp,
    attack: c.stats.attack,
    armor: Math.max(0, c.stats.armor),
    speed: c.stats.speed,
    gold: c.gold ?? 0,
    statuses: EMPTY_STATUSES,
    base: c.stats,
    strikes: 0,
    turns: 0,
    extraStrikes: 0,
    exposedCharges: 1,
    wounded: false,
    thornsFired: false,
  }
}

export const createBattle = (player: Combatant, enemy: Combatant, rules: Rules = DEFAULT_RULES): BattleState => {
  const fighters = { player: createFighter('player', player), enemy: createFighter('enemy', enemy) }
  const faster: Side = fighters.player.speed >= fighters.enemy.speed ? 'player' : 'enemy'
  return {
    rules,
    fighters,
    sources: { player: orderSources(player.sources), enemy: orderSources(enemy.sources) },
    counters: {},
    round: 1,
    actor: faster,
    events: [],
    winner: null,
    depth: 0,
  }
}

export const visible = (f: FighterState): FighterVisible => ({
  hp: f.hp,
  maxHp: f.maxHp,
  attack: f.attack,
  armor: f.armor,
  speed: f.speed,
  gold: f.gold,
  statuses: f.statuses,
})

export const emit = (state: BattleState, body: BattleEventBody): BattleState => ({
  ...state,
  events: [...state.events, { ...body, snapshot: { player: visible(state.fighters.player), enemy: visible(state.fighters.enemy) } }],
})

export const updateFighter = (
  state: BattleState,
  side: Side,
  patch: Partial<FighterState> | ((f: FighterState) => Partial<FighterState>),
): BattleState => {
  const current = state.fighters[side]
  const changes = typeof patch === 'function' ? patch(current) : patch
  return { ...state, fighters: { ...state.fighters, [side]: { ...current, ...changes } } }
}

export const counterKey = (side: Side, sourceId: string, name: string): string => `${side}:${sourceId}:${name}`

export const getCounter = (state: BattleState, key: string, fallback = 0): number => state.counters[key] ?? fallback

export const setCounter = (state: BattleState, key: string, value: number): BattleState => ({
  ...state,
  counters: { ...state.counters, [key]: value },
})

export const isOver = (state: BattleState): boolean => state.winner !== null
