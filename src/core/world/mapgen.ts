/**
 * Woodland map generator. Deterministic per seed:
 * biome sectors around a central starting area → a meandering river → locations and enemies
 * → paths linking everything to the start (bridges over the river) → biome decoration → blocked border.
 */
import { createRng, nextFloat, nextInt, pick, type Rng } from '../rng'
import { tileKey } from './fog'
import { blocksMovement, indexOf, manhattan } from './terrain'
import type { Biome, EnemyEntity, Point, Poi, PoiKind, Terrain, World, WorldMap } from './types'

export interface MapGenOptions {
  readonly width?: number
  readonly height?: number
}

export const POI_COUNTS = {
  chest: 8,
  weaponPile: 3,
  campfire: 4,
  merchant: 2,
  bladeOil: 3,
  forge: 2,
  grave: 2,
  jewelryBox: 2,
  golem: 2,
  cauldron: 2,
  beehive: 2,
  crystalBall: 2,
  lookout: 2,
  waypoint: 3,
  fairy: 1,
  wishingWell: 1,
  tent: 1,
  woodcutter: 1,
  enemy: 22,
} as const

/** Which regular enemies live where (wiki: Woodland_enemies). */
export const BIOME_ENEMIES: Readonly<Record<Biome, readonly string[]>> = {
  start: ['bear', 'spider', 'wolf'],
  glade: ['spider', 'hedgehog'],
  plains: ['wolf', 'raven'],
  forest: ['bear', 'bat'],
}

const DECOR: Readonly<Record<Biome, readonly (readonly [Terrain, number])[]>> = {
  start: [['pine', 0.2], ['bush', 0.06], ['tuft', 0.1], ['sprouts', 0.04]],
  glade: [['flowers', 0.18], ['tallGrass', 0.14], ['pine', 0.08], ['bush', 0.05]],
  plains: [['rock', 0.22], ['stones', 0.1], ['tuft', 0.1], ['deadTree', 0.03]],
  forest: [['pines', 0.3], ['pine', 0.16], ['deadTree', 0.05], ['sprouts', 0.05]],
}

const OUTER_BIOMES: readonly Biome[] = ['glade', 'plains', 'forest']
const START_RADIUS = 7
const EDGE_MARGIN = 2
const MIN_SPACING = 3
/** Extra path links on top of the spanning tree, so walking isn't all dead ends. */
const LOOPS = 8

/** Mutable scratch state local to one generateWorld call; never escapes. */
interface Draft {
  rng: Rng
  readonly width: number
  readonly height: number
  readonly terrain: Terrain[]
  readonly biome: Biome[]
  readonly taken: Set<string>
}

const roll = (d: Draft): number => {
  const [v, next] = nextFloat(d.rng)
  d.rng = next
  return v
}

const int = (d: Draft, min: number, max: number): number => {
  const [v, next] = nextInt(d.rng, min, max)
  d.rng = next
  return v
}

const choose = <T>(d: Draft, items: readonly T[]): T => {
  const [v, next] = pick(d.rng, items)
  d.rng = next
  return v
}

const assignBiomes = (d: Draft, start: Point): void => {
  const phase = roll(d) * Math.PI * 2
  const wobble = roll(d) * Math.PI * 2
  const sector = (Math.PI * 2) / OUTER_BIOMES.length
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      const dist = Math.hypot(x - start.x, y - start.y)
      if (dist < START_RADIUS) {
        d.biome[y * d.width + x] = 'start'
        continue
      }
      const angle = Math.atan2(y - start.y, x - start.x) + 0.4 * Math.sin(dist / 4 + wobble)
      const turn = (((angle - phase) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      d.biome[y * d.width + x] = OUTER_BIOMES[Math.floor(turn / sector) % OUTER_BIOMES.length] as Biome
    }
  }
}

const carveRiver = (d: Draft, start: Point): void => {
  const side = roll(d) < 0.5 ? -1 : 1
  const clampX = (x: number) => Math.min(d.width - 4, Math.max(3, x))
  let x = clampX(start.x + side * int(d, 12, 16))
  for (let y = 0; y < d.height; y++) {
    d.terrain[y * d.width + x] = 'water'
    const next = clampX(x + int(d, -1, 1))
    if (next !== x && y + 1 < d.height) d.terrain[y * d.width + next] = 'water'
    x = next
  }
}

const canPlace = (d: Draft, p: Point, start: Point): boolean =>
  p.x >= EDGE_MARGIN &&
  p.y >= EDGE_MARGIN &&
  p.x < d.width - EDGE_MARGIN &&
  p.y < d.height - EDGE_MARGIN &&
  d.terrain[p.y * d.width + p.x] !== 'water' &&
  manhattan(p, start) >= 5 &&
  [...d.taken].every((key) => {
    const [tx = 0, ty = 0] = key.split(',').map(Number)
    return manhattan({ x: tx, y: ty }, p) >= MIN_SPACING
  })

const randomSpot = (d: Draft, start: Point): Point => {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const p = { x: int(d, EDGE_MARGIN, d.width - EDGE_MARGIN - 1), y: int(d, EDGE_MARGIN, d.height - EDGE_MARGIN - 1) }
    if (canPlace(d, p, start)) {
      d.taken.add(tileKey(p.x, p.y))
      return p
    }
  }
  throw new Error('mapgen: could not place a location; map too small for the configured counts')
}

const placeLocations = (d: Draft, start: Point): { pois: Poi[]; enemies: EnemyEntity[] } => {
  const home = { x: start.x, y: start.y - 1 }
  d.taken.add(tileKey(start.x, start.y))
  d.taken.add(tileKey(home.x, home.y))
  const pois: Poi[] = [{ id: 'home', kind: 'home', ...home, used: false }]
  const placed: readonly Exclude<PoiKind, 'home'>[] = ['campfire', 'chest', 'weaponPile', 'merchant', 'bladeOil', 'forge', 'grave', 'jewelryBox', 'golem', 'cauldron', 'beehive', 'crystalBall', 'lookout', 'waypoint', 'fairy', 'wishingWell', 'tent', 'woodcutter']
  const kinds = placed.flatMap((kind) => Array.from({ length: POI_COUNTS[kind] }, () => kind))
  kinds.forEach((kind, i) => pois.push({ id: `${kind}-${i}`, kind, ...randomSpot(d, start), used: false }))
  const enemies: EnemyEntity[] = Array.from({ length: POI_COUNTS.enemy }, (_, i) => {
    const p = randomSpot(d, start)
    const biome = d.biome[p.y * d.width + p.x] as Biome
    return { id: `enemy-${i}`, enemyId: choose(d, BIOME_ENEMIES[biome]), ...p, alive: true }
  })
  return { pois, enemies }
}

const carveTile = (d: Draft, x: number, y: number): void => {
  const i = y * d.width + x
  d.terrain[i] = d.terrain[i] === 'water' || d.terrain[i] === 'bridge' ? 'bridge' : 'path'
}

/** L-shaped path with a random bend order. */
const carvePath = (d: Draft, from: Point, to: Point): void => {
  const horizontalFirst = roll(d) < 0.5
  const corner = horizontalFirst ? { x: to.x, y: from.y } : { x: from.x, y: to.y }
  for (const [a, b] of [[from, corner], [corner, to]] as const) {
    const sx = Math.sign(b.x - a.x)
    const sy = Math.sign(b.y - a.y)
    for (let x = a.x, y = a.y; ; x += sx, y += sy) {
      carveTile(d, x, y)
      if (x === b.x && y === b.y) break
    }
  }
}

/** Spanning tree from the start (each target joins its nearest connected node), plus a few loops. */
const connect = (d: Draft, start: Point, targets: readonly Point[]): void => {
  const connected: Point[] = [start]
  const byDistance = [...targets].sort((a, b) => manhattan(a, start) - manhattan(b, start))
  for (const target of byDistance) {
    const nearest = connected.reduce((best, p) => (manhattan(p, target) < manhattan(best, target) ? p : best), start)
    carvePath(d, nearest, target)
    connected.push(target)
  }
  if (targets.length < 3) return
  for (let i = 0; i < LOOPS; i++) {
    const from = choose(d, targets)
    const others = targets.filter((t) => t !== from).sort((a, b) => manhattan(a, from) - manhattan(b, from))
    // Skip the nearest (usually already linked); join one of the next few.
    const to = others[int(d, 1, Math.min(3, others.length - 1))]
    if (to) carvePath(d, from, to)
  }
}

const decorate = (d: Draft): void => {
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      const i = y * d.width + x
      const border = x === 0 || y === 0 || x === d.width - 1 || y === d.height - 1
      if (border) {
        d.terrain[i] = 'pines'
        continue
      }
      if (d.terrain[i] !== 'ground' || d.taken.has(tileKey(x, y))) continue
      const r = roll(d)
      let acc = 0
      for (const [terrain, weight] of DECOR[d.biome[i] as Biome]) {
        acc += weight
        if (r < acc) {
          d.terrain[i] = terrain
          break
        }
      }
    }
  }
}

export const generateWorld = (seed: number, opts: MapGenOptions = {}): World => {
  const width = opts.width ?? 64
  const height = opts.height ?? 48
  const d: Draft = {
    rng: createRng(seed),
    width,
    height,
    terrain: Array.from({ length: width * height }, () => 'ground'),
    biome: Array.from({ length: width * height }, () => 'start'),
    taken: new Set(),
  }
  const start = { x: Math.floor(width / 2), y: Math.floor(height / 2) }

  assignBiomes(d, start)
  carveRiver(d, start)
  const { pois, enemies } = placeLocations(d, start)
  connect(d, start, [...pois, ...enemies])
  decorate(d)

  const map: WorldMap = { width, height, terrain: d.terrain, biome: d.biome }
  if (blocksMovement(map.terrain[indexOf(map, start.x, start.y)] ?? 'ground')) throw new Error('mapgen: start is blocked')
  return { map, start, pois, enemies }
}
