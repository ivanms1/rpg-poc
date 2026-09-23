import { tileKey } from './fog'
import { BIOME_ENEMIES, generateWorld, POI_COUNTS } from './mapgen'
import { reachableFrom } from './pathing'
import { indexOf, isWalkable, manhattan } from './terrain'

const SEEDS = [1, 7, 42, 1337, 2024, 99999]

describe('generateWorld', () => {
  it('is deterministic per seed', () => {
    expect(generateWorld(42)).toEqual(generateWorld(42))
    expect(generateWorld(1).map.terrain).not.toEqual(generateWorld(2).map.terrain)
  })

  it.each(SEEDS)('seed %i: has consistent dimensions', (seed) => {
    const { map } = generateWorld(seed, { width: 64, height: 48 })
    expect(map.terrain).toHaveLength(64 * 48)
    expect(map.biome).toHaveLength(64 * 48)
  })

  it.each(SEEDS)('seed %i: starts on the path in the starting area, home next door', (seed) => {
    const { map, start, pois } = generateWorld(seed)
    expect(isWalkable(map, start.x, start.y)).toBe(true)
    expect(map.biome[indexOf(map, start.x, start.y)]).toBe('start')
    const home = pois.find((p) => p.kind === 'home')
    expect(home && manhattan(home, start)).toBe(1)
  })

  it.each(SEEDS)('seed %i: every location and enemy is reachable from the start', (seed) => {
    const { map, start, pois, enemies } = generateWorld(seed)
    const reachable = reachableFrom(map, start)
    for (const p of [...pois, ...enemies]) expect(reachable.has(tileKey(p.x, p.y))).toBe(true)
  })

  it.each(SEEDS)('seed %i: places the configured counts on distinct tiles', (seed) => {
    const { start, pois, enemies } = generateWorld(seed)
    const count = (kind: string) => pois.filter((p) => p.kind === kind).length
    expect(count('home')).toBe(1)
    expect(count('chest')).toBe(POI_COUNTS.chest)
    expect(count('weaponPile')).toBe(POI_COUNTS.weaponPile)
    expect(count('campfire')).toBe(POI_COUNTS.campfire)
    for (const kind of ['merchant', 'bladeOil', 'forge', 'grave', 'jewelryBox', 'golem', 'cauldron', 'beehive'] as const) expect(count(kind)).toBe(POI_COUNTS[kind])
    expect(enemies).toHaveLength(POI_COUNTS.enemy)
    const keys = [start, ...pois, ...enemies].map((p) => tileKey(p.x, p.y))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it.each(SEEDS)('seed %i: enemies match their biome', (seed) => {
    const { map, enemies } = generateWorld(seed)
    for (const e of enemies) {
      const biome = map.biome[indexOf(map, e.x, e.y)]!
      expect(BIOME_ENEMIES[biome]).toContain(e.enemyId)
    }
  })

  it.each(SEEDS)('seed %i: the border is impassable', (seed) => {
    const { map } = generateWorld(seed)
    for (let x = 0; x < map.width; x++) {
      expect(isWalkable(map, x, 0)).toBe(false)
      expect(isWalkable(map, x, map.height - 1)).toBe(false)
    }
  })

  it.each(SEEDS)('seed %i: a river crosses the map with at least one bridge', (seed) => {
    const { map } = generateWorld(seed)
    expect(map.terrain.filter((t) => t === 'water').length).toBeGreaterThan(20)
    expect(map.terrain).toContain('bridge')
  })

  it.each(SEEDS)('seed %i: the path network has loops, not just dead ends', (seed) => {
    const { map } = generateWorld(seed)
    let nodes = 0
    let edges = 0
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (!isWalkable(map, x, y)) continue
        nodes++
        if (isWalkable(map, x + 1, y)) edges++
        if (isWalkable(map, x, y + 1)) edges++
      }
    }
    expect(edges - nodes + 1).toBeGreaterThanOrEqual(3)
  })

  it('uses every biome', () => {
    const { map } = generateWorld(5)
    expect(new Set(map.biome)).toEqual(new Set(['start', 'glade', 'plains', 'forest']))
  })
})
