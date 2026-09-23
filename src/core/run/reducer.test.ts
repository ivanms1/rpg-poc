import { CONTENT } from '../../data/content'
import { ITEMS_BY_ID } from '../../data/items'
import type { Equipped } from '../items/loadout'
import { STEPS_PER_WEEK } from '../world/clock'
import type { EnemyEntity, Poi, Terrain, World } from '../world/types'
import { createRun, runReducer } from './reducer'
import type { RunAction, RunState } from './types'

const W = 15
const H = 11
const START = { x: 7, y: 5 }

const room = (): World['map'] => {
  const terrain: Terrain[] = Array.from({ length: W * H }, (_, i) => {
    const x = i % W
    const y = Math.floor(i / W)
    return x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 'pines' : 'ground'
  })
  return { width: W, height: H, terrain, biome: terrain.map(() => 'start') }
}

const poi = (kind: Poi['kind'], x: number, y: number): Poi => ({ id: `${kind}@${x},${y}`, kind, x, y, used: false })
const enemy = (enemyId: string, x: number, y: number): EnemyEntity => ({ id: `${enemyId}@${x},${y}`, enemyId, x, y, alive: true })

const world = (pois: readonly Poi[] = [], enemies: readonly EnemyEntity[] = []): World => ({ map: room(), start: START, pois, enemies })

const reduce = runReducer(CONTENT)
const play = (state: RunState, ...actions: RunAction[]): RunState => actions.reduce(reduce, state)
const right: RunAction = { type: 'move', dx: 1, dy: 0 }
const left: RunAction = { type: 'move', dx: -1, dy: 0 }
const at = (state: RunState, step: number): RunState => ({ ...state, step })
const vest: Equipped = { item: ITEMS_BY_ID['leather-vest']! }

describe('createRun', () => {
  it('starts a fresh hero at the start with a Wooden Stick and 4 empty slots', () => {
    const s = createRun(1, CONTENT, { world: world() })
    expect(s).toMatchObject({ player: START, week: 1, step: 0, screen: { kind: 'map' } })
    expect(s.hero).toMatchObject({ hp: 20, gold: 0, items: [null, null, null, null] })
    expect(s.hero.weapon?.item.id).toBe('wooden-stick')
    expect(s.revealed.has('7,5')).toBe(true)
  })

  it('picks three distinct bosses, the first from the week 1 pool', () => {
    const s = createRun(1, CONTENT)
    expect(new Set(s.bosses).size).toBe(3)
    expect(CONTENT.bosses.find((b) => b.id === s.bosses[0])?.week).toBe(1)
  })

  it('generates a world from the seed by default', () => {
    expect(createRun(5, CONTENT).world).toEqual(createRun(5, CONTENT).world)
  })
})

describe('moving', () => {
  it('steps onto walkable tiles and ticks the clock', () => {
    const s = play(createRun(1, CONTENT, { world: world() }), right)
    expect(s.player).toEqual({ x: 8, y: 5 })
    expect(s.step).toBe(1)
  })

  it('bumping into an obstacle costs nothing', () => {
    const start = { ...createRun(1, CONTENT, { world: world() }), player: { x: 1, y: 5 } }
    expect(play(start, left)).toBe(start)
  })

  it('is ignored while a dialog is open', () => {
    const s = play(createRun(1, CONTENT, { world: world([poi('chest', 8, 5)]) }), right)
    expect(s.screen.kind).toBe('choice')
    expect(play(s, right)).toBe(s)
  })
})

describe('battles', () => {
  const withWolf = () => createRun(1, CONTENT, { world: world([], [enemy('wolf', 8, 5)]) })

  it('walking into an enemy starts a battle at the current week level', () => {
    const s = play(withWolf(), right)
    expect(s.screen.kind).toBe('battle')
    if (s.screen.kind !== 'battle') return
    expect(s.screen.battle).toMatchObject({ enemyName: 'Wolf', boss: false, goldReward: 1 })
  })

  it('a win keeps health, pays gold and removes the enemy', () => {
    const s = play(withWolf(), right, { type: 'finishBattle' })
    expect(s.screen.kind).toBe('map')
    expect(s.hero.gold).toBe(1)
    expect(s.world.enemies[0]?.alive).toBe(false)
    expect(s.hero.hp).toBeLessThanOrEqual(20)
  })

  it('a loss ends the run', () => {
    const weak = { ...withWolf(), hero: { ...withWolf().hero, hp: 1, weapon: null } }
    expect(play(weak, right, { type: 'finishBattle' }).screen.kind).toBe('gameOver')
  })

  it('finishBattle outside a battle does nothing', () => {
    const s = withWolf()
    expect(play(s, { type: 'finishBattle' })).toBe(s)
  })
})

describe('night', () => {
  const night = (enemies: readonly EnemyEntity[]) => at(createRun(1, CONTENT, { world: world([], enemies) }), 60)

  it('enemies that see you close in one tile per step', () => {
    const s = play(night([enemy('bat', 11, 5)]), right)
    expect(s.world.enemies[0]).toMatchObject({ x: 10, y: 5 })
  })

  it('enemies out of sight stay put, and nobody moves by day', () => {
    expect(play(night([enemy('bat', 13, 9)]), right).world.enemies[0]).toMatchObject({ x: 13, y: 9 })
    const day = createRun(1, CONTENT, { world: world([], [enemy('bat', 11, 5)]) })
    expect(play(day, right).world.enemies[0]).toMatchObject({ x: 11, y: 5 })
  })

  it('an enemy that reaches you starts a battle', () => {
    const s = play(night([enemy('bat', 9, 5)]), right)
    expect(s.screen).toMatchObject({ kind: 'battle', battle: { enemyName: 'Bat' } })
  })
})

describe('chests and weapon piles', () => {
  const chestRun = () => createRun(1, CONTENT, { world: world([poi('chest', 8, 5)]) })

  it('opening a chest offers 3 commons; choosing one fills a slot and empties the chest', () => {
    const open = play(chestRun(), right)
    expect(open.screen).toMatchObject({ kind: 'choice', title: 'Treasure Chest' })
    if (open.screen.kind !== 'choice') return
    const picked = open.screen.options[1]!.item.id
    const s = play(open, { type: 'choose', index: 1 })
    expect(s.screen.kind).toBe('map')
    expect(s.hero.items[0]?.item.id).toBe(picked)
    expect(s.world.pois[0]?.used).toBe(true)
    expect(play(s, left, right).screen.kind).toBe('map')
  })

  it('closing a chest keeps the same offer for later', () => {
    const open = play(chestRun(), right)
    const again = play(open, { type: 'dismiss' }, left, right)
    expect(again.screen).toEqual(open.screen)
  })

  it('with a full inventory, asks for a discard first', () => {
    const full = { ...chestRun(), hero: { ...chestRun().hero, items: [vest, vest, vest, vest] } }
    const blocked = play(full, right, { type: 'choose', index: 0 })
    expect(blocked.screen).toMatchObject({ kind: 'choice', notice: expect.stringContaining('full') })
    const s = play(blocked, { type: 'discard', slot: 2 }, { type: 'choose', index: 0 })
    expect(s.screen.kind).toBe('map')
    expect(s.hero.items[2]?.item.rarity).toBe('common')
  })

  it('a weapon pile replaces the weapon', () => {
    const s = play(createRun(1, CONTENT, { world: world([poi('weaponPile', 8, 5)]) }), right)
    expect(s.screen).toMatchObject({ kind: 'choice', title: 'Weapon Pile' })
    const after = play(s, { type: 'choose', index: 0 })
    expect(after.hero.weapon?.item.id).not.toBe('wooden-stick')
  })

  it('choose with a bad index does nothing', () => {
    const open = play(chestRun(), right)
    expect(play(open, { type: 'choose', index: 9 })).toBe(open)
  })
})

describe('resting', () => {
  const hurt = (s: RunState): RunState => ({ ...s, hero: { ...s.hero, hp: 5 } })

  it('a campfire by day just tells you to come back at night', () => {
    const s = play(hurt(createRun(1, CONTENT, { world: world([poi('campfire', 8, 5)]) })), right)
    expect(s.screen).toMatchObject({ kind: 'message', title: 'Campfire' })
    expect(s.hero.hp).toBe(5)
  })

  it('a campfire at night restores 10 health and skips to morning', () => {
    const s = play(at(hurt(createRun(1, CONTENT, { world: world([poi('campfire', 8, 5)]) })), 55), right)
    expect(s.hero.hp).toBe(15)
    expect(s.step).toBe(80)
  })

  it('home at night restores all health', () => {
    const s = play(at(hurt(createRun(1, CONTENT, { world: world([poi('home', 8, 5)]) })), 55), right)
    expect(s.hero.hp).toBe(20)
    expect(s.step).toBe(80)
  })

  it('dismiss closes messages', () => {
    const s = play(createRun(1, CONTENT, { world: world([poi('home', 8, 5)]) }), right, { type: 'dismiss' })
    expect(s.screen.kind).toBe('map')
  })
})

describe('the weekly boss', () => {
  const strong = (s: RunState): RunState => ({
    ...s,
    hero: { ...s.hero, hp: 500, baseHealth: 500, weapon: { item: CONTENT.weapons.find((w) => w.id === 'frozen-iceblade')! } },
  })

  it('arrives when the week runs out', () => {
    const s = play(at(createRun(1, CONTENT, { world: world() }), STEPS_PER_WEEK - 1), right)
    expect(s.screen).toMatchObject({ kind: 'battle', battle: { boss: true } })
  })

  it('can be fought early', () => {
    const s = play(createRun(1, CONTENT, { world: world() }), { type: 'fightBoss' })
    expect(s.screen).toMatchObject({ kind: 'battle', battle: { boss: true } })
  })

  it('beating it starts the next week with 2 more slots', () => {
    const s = play(strong(createRun(1, CONTENT, { world: world() })), { type: 'fightBoss' }, { type: 'finishBattle' })
    expect(s).toMatchObject({ week: 2, step: 0, screen: { kind: 'message' } })
    expect(s.hero.items).toHaveLength(6)
  })

  it('beating the week 3 boss wins the run', () => {
    const s = play({ ...strong(createRun(1, CONTENT, { world: world() })), week: 3 }, { type: 'fightBoss' }, { type: 'finishBattle' })
    expect(s.screen.kind).toBe('victory')
  })

  it('taking loot on the last step of the week brings the boss', () => {
    const open = play(at(createRun(1, CONTENT, { world: world([poi('chest', 8, 5)]) }), STEPS_PER_WEEK - 1), right)
    expect(open.screen.kind).toBe('choice')
    expect(play(open, { type: 'choose', index: 0 }).screen).toMatchObject({ kind: 'battle', battle: { boss: true } })
  })

  it('sleeping through the last night brings the boss once the message closes', () => {
    const s = play(at(createRun(1, CONTENT, { world: world([poi('home', 8, 5)]) }), 220), right)
    expect(s.step).toBe(STEPS_PER_WEEK)
    expect(play(s, { type: 'dismiss' }).screen.kind).toBe('battle')
  })
})

describe('discard', () => {
  it('empties a slot on the map', () => {
    const s = { ...createRun(1, CONTENT, { world: world() }) }
    const withVest = { ...s, hero: { ...s.hero, items: [vest, null, null, null] } }
    expect(play(withVest, { type: 'discard', slot: 0 }).hero.items[0]).toBeNull()
  })

  it('is ignored during battles', () => {
    const s = play(createRun(1, CONTENT, { world: world([], [enemy('wolf', 8, 5)]) }), right)
    expect(play(s, { type: 'discard', slot: 0 })).toBe(s)
  })
})
