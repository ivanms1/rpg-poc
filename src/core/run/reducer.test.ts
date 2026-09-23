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
    return x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 'pines' : 'path'
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
    expect(s.hero).toMatchObject({ hp: 20, gold: 0, items: [null, null, null, null], oils: [], edge: null })
    expect(s.hero.weapon?.item.id).toBe('wooden-stick')
    expect(s.revealed.has('7,5')).toBe(true)
  })

  it.each([1, 2, 3, 4, 5])('seed %i: one boss per week from that week’s pool, Leshen last', (seed) => {
    const s = createRun(seed, CONTENT)
    expect(s.bosses.map((id) => CONTENT.bosses.find((b) => b.id === id)?.week)).toEqual([1, 2, 3])
    expect(s.bosses[2]).toBe('leshen')
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

  it('cannot leave the path', () => {
    const base = createRun(1, CONTENT, { world: world() })
    const terrain = base.world.map.terrain.map((t, i) => (i === 5 * W + 8 ? 'ground' : t))
    const offPath = { ...base, world: { ...base.world, map: { ...base.world.map, terrain } } }
    expect(play(offPath, right)).toBe(offPath)
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

  it('boss battles come with an intro; regular battles do not', () => {
    const boss = play(createRun(1, CONTENT, { world: world() }), { type: 'fightBoss' })
    expect(boss.screen).toMatchObject({ kind: 'battle', battle: { intro: { subtitle: 'The week 1 boss arrives' } } })
    if (boss.screen.kind === 'battle') expect(boss.screen.battle.intro?.title).toBe(boss.screen.battle.enemyName)
    const regular = play(createRun(1, CONTENT, { world: world([], [enemy('wolf', 8, 5)]) }), right)
    if (regular.screen.kind === 'battle') expect(regular.screen.battle.intro).toBeUndefined()
  })

  it('the finale has its own intro, and the second form announces the transformation', () => {
    const week3 = { ...strong(createRun(1, CONTENT, { world: world() })), week: 3 as const }
    const leshen = play(week3, { type: 'fightBoss' })
    expect(leshen.screen).toMatchObject({ battle: { intro: { title: 'Leshen', subtitle: 'The final battle' } } })
    expect(play(leshen, { type: 'finishBattle' }).screen).toMatchObject({
      battle: { intro: { title: 'Woodland Abomination', subtitle: 'Leshen transforms!' } },
    })
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

  it('beating Leshen brings the Woodland Abomination at full health; beating that wins the run', () => {
    const week3 = { ...strong(createRun(1, CONTENT, { world: world() })), week: 3 as const }
    const leshen = play(week3, { type: 'fightBoss' })
    expect(leshen.screen).toMatchObject({ kind: 'battle', battle: { enemyName: 'Leshen' } })
    const abomination = play(leshen, { type: 'finishBattle' })
    expect(abomination.screen).toMatchObject({ kind: 'battle', battle: { enemyName: 'Woodland Abomination', boss: true } })
    if (abomination.screen.kind !== 'battle') return
    expect(abomination.screen.battle.result.events[0]?.snapshot.player.hp).toBe(500)
    expect(play(abomination, { type: 'finishBattle' }).screen.kind).toBe('victory')
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

describe('traveling merchant', () => {
  const shopRun = (gold: number) => {
    const s = createRun(1, CONTENT, { world: world([poi('merchant', 8, 5)]) })
    return play({ ...s, hero: { ...s.hero, gold } }, right)
  }

  it('shows 6 wares with prices and a 1-gold reroll', () => {
    const s = shopRun(20)
    expect(s.screen).toMatchObject({ kind: 'shop', rerollCost: 1 })
    if (s.screen.kind === 'shop') expect(s.screen.stock).toHaveLength(6)
  })

  it('buying pays gold, delivers the ware and marks it sold', () => {
    const open = shopRun(20)
    if (open.screen.kind !== 'shop') throw new Error('expected shop')
    const index = open.screen.stock.findIndex((w) => w.equipped.item.kind === 'item')
    const ware = open.screen.stock[index]!
    const s = play(open, { type: 'buy', index })
    expect(s.hero.gold).toBe(20 - ware.price)
    expect(s.hero.items[0]?.item.id).toBe(ware.equipped.item.id)
    expect(s.screen).toMatchObject({ kind: 'shop' })
    if (s.screen.kind === 'shop') expect(s.screen.stock[index]?.sold).toBe(true)
    expect(play(s, { type: 'buy', index })).toBe(s)
  })

  it('buying a weapon replaces the current one', () => {
    const open = shopRun(20)
    if (open.screen.kind !== 'shop') throw new Error('expected shop')
    const index = open.screen.stock.findIndex((w) => w.equipped.item.kind === 'weapon')
    if (index === -1) return
    expect(play(open, { type: 'buy', index }).hero.weapon?.item.id).toBe(open.screen.stock[index]!.equipped.item.id)
  })

  it('refuses without enough gold', () => {
    const s = play(shopRun(0), { type: 'buy', index: 0 })
    expect(s.screen).toMatchObject({ kind: 'shop', notice: expect.stringContaining('gold') })
    expect(s.hero.items[0]).toBeNull()
  })

  it('rerolling costs 1, then 2, and changes the stock', () => {
    const open = shopRun(5)
    const once = play(open, { type: 'reroll' })
    expect(once.hero.gold).toBe(4)
    expect(once.screen).toMatchObject({ kind: 'shop', rerollCost: 2 })
    const twice = play(once, { type: 'reroll' })
    expect(twice.hero.gold).toBe(2)
    expect(play(shopRun(0), { type: 'reroll' }).screen).toMatchObject({ notice: expect.stringContaining('gold') })
  })

  it('keeps its stock and prices when you come back', () => {
    const open = shopRun(20)
    const back = play(open, { type: 'dismiss' }, left, right)
    expect(back.screen).toEqual(open.screen)
  })
})

describe('blade oil, forge, grave and jewelry box', () => {
  const visit = (kind: Poi['kind'], patch: Partial<RunState['hero']> = {}, step = 0) => {
    const s = createRun(1, CONTENT, { world: world([poi(kind, 8, 5)]) })
    return play({ ...s, step, hero: { ...s.hero, ...patch } }, right)
  }

  it('blade oil offers the oils this weapon lacks; taking one is permanent for the weapon', () => {
    const s = visit('bladeOil', { oils: ['attack'] })
    expect(s.screen).toMatchObject({ kind: 'oil', options: ['armor', 'speed'] })
    const after = play(s, { type: 'choose', index: 1 })
    expect(after.hero.oils).toEqual(['attack', 'speed'])
    expect(after.world.pois[0]?.used).toBe(true)
  })

  it('blade oil with every oil applied just says so', () => {
    expect(visit('bladeOil', { oils: ['attack', 'armor', 'speed'] }).screen).toMatchObject({ kind: 'message' })
  })

  it('the first forge edge is free', () => {
    const s = visit('forge')
    expect(s.screen).toMatchObject({ kind: 'forge', cost: 0 })
    if (s.screen.kind !== 'forge') return
    const edge = s.screen.options[0]!
    expect(play(s, { type: 'choose', index: 0 }).hero.edge?.id).toBe(edge.id)
  })

  it('replacing an edge costs 10 gold', () => {
    const edge = CONTENT.edges[0]!
    const poor = visit('forge', { edge, gold: 3 })
    expect(poor.screen).toMatchObject({ kind: 'forge', cost: 10 })
    expect(play(poor, { type: 'choose', index: 0 }).screen).toMatchObject({ notice: expect.stringContaining('gold') })
    const rich = play(visit('forge', { edge, gold: 12 }), { type: 'choose', index: 1 })
    expect(rich.hero.gold).toBe(2)
    expect(rich.world.pois[0]?.used).toBe(true)
  })

  it("the Hero's Grave is sealed by day and offers heroic items at night", () => {
    expect(visit('grave').screen).toMatchObject({ kind: 'message', title: "Hero's Grave" })
    const night = visit('grave', {}, 55)
    expect(night.screen).toMatchObject({ kind: 'choice', title: "Hero's Grave" })
    if (night.screen.kind === 'choice') expect(night.screen.options.every((o) => o.item.rarity === 'heroic')).toBe(true)
  })

  it('a jewelry box offers jewelry', () => {
    const s = visit('jewelryBox')
    expect(s.screen).toMatchObject({ kind: 'choice', title: 'Jewelry Box' })
    if (s.screen.kind === 'choice') expect(s.screen.options.every((o) => o.item.tags.includes('jewelry'))).toBe(true)
  })
})

describe('rare and better items stay unique at claim time', () => {
  const heroic = { item: CONTENT.weapons.find((w) => w.id === 'twin-blade')! }
  const cached = (kind: Poi['kind'], options: Equipped[]) => ({ ...poi(kind, 8, 5), offer: options })

  it('a cached offer drops items the hero has since acquired', () => {
    const s = createRun(1, CONTENT, { world: world([cached('weaponPile', [heroic, { item: CONTENT.weapons.find((w) => w.id === 'battle-axe')! }])]) })
    const open = play({ ...s, hero: { ...s.hero, weapon: heroic } }, right)
    expect(open.screen).toMatchObject({ kind: 'choice' })
    if (open.screen.kind === 'choice') expect(open.screen.options.map((o) => o.item.id)).toEqual(['battle-axe'])
  })

  it('an offer with nothing left closes the location', () => {
    const s = createRun(1, CONTENT, { world: world([cached('weaponPile', [heroic])]) })
    const open = play({ ...s, hero: { ...s.hero, weapon: heroic } }, right)
    expect(open.screen).toMatchObject({ kind: 'message' })
    expect(open.world.pois[0]?.used).toBe(true)
  })

  it('the merchant will not sell something the hero already has', () => {
    const s = createRun(1, CONTENT, { world: world([{ ...poi('merchant', 8, 5), stock: [{ equipped: heroic, price: 3, sold: false }], rerollCost: 1 }]) })
    const open = play({ ...s, hero: { ...s.hero, gold: 20, weapon: heroic } }, right)
    const after = play(open, { type: 'buy', index: 0 })
    expect(after.screen).toMatchObject({ kind: 'shop', notice: expect.stringContaining('already') })
    expect(after.hero.gold).toBe(20)
  })
})

describe('Loose Change', () => {
  const change = { item: CONTENT.items.find((i) => i.id === 'loose-change')!, tier: 'golden' as const }
  const rich = (s: RunState, step: number): RunState => ({ ...s, step, hero: { ...s.hero, items: [change, null, null, null] } })

  it('pays its gold (tier-scaled) when a new day begins, not at nightfall', () => {
    const base = createRun(1, CONTENT, { world: world() })
    expect(play(rich(base, 49), right).hero.gold).toBe(0)
    expect(play(rich(base, 79), right).hero.gold).toBe(6)
  })

  it('pays when sleeping into the morning and when a new week starts', () => {
    const home = createRun(1, CONTENT, { world: world([poi('home', 8, 5)]) })
    expect(play(rich(home, 55), right).hero.gold).toBe(6)
    const boss = { ...rich(createRun(1, CONTENT, { world: world() }), 10), hero: { ...rich(createRun(1, CONTENT, { world: world() }), 10).hero, hp: 500, baseHealth: 500, weapon: { item: CONTENT.weapons.find((w) => w.id === 'frozen-iceblade')! } } }
    const won = play(boss, { type: 'fightBoss' }, { type: 'finishBattle' })
    expect(won.week).toBe(2)
    expect(won.hero.gold).toBe(6)
  })
})

describe('reorder', () => {
  it('swaps two slots on the map', () => {
    const s = createRun(1, CONTENT, { world: world() })
    const withVest = { ...s, hero: { ...s.hero, items: [vest, null, null, null] } }
    expect(play(withVest, { type: 'reorder', from: 0, to: 3 }).hero.items[3]).toBe(vest)
  })

  it('is ignored during battles', () => {
    const s = play(createRun(1, CONTENT, { world: world([], [enemy('wolf', 8, 5)]) }), right)
    expect(play(s, { type: 'reorder', from: 0, to: 1 })).toBe(s)
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
