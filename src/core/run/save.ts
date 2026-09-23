/**
 * Save / load. The map itself is regenerated from the seed; everything that changes during a run
 * (hero, locations, enemies, clock, fog, RNG) is stored, with items referenced by id and resolved
 * against the game content on load. Saved data is validated before use.
 */
import { z } from 'zod'
import type { Equipped } from '../items/loadout'
import type { EdgeDef, ItemDef } from '../items/types'
import { generateWorld } from '../world/mapgen'
import type { Poi } from '../world/types'
import type { Content, RunState } from './types'

export const SAVE_VERSION = 1

const Int = z.number().int()
const Tier = z.enum(['normal', 'golden', 'diamond'])
const Ref = z.object({ id: z.string(), tier: Tier.optional() })
const Point = z.object({ x: Int, y: Int })

const PoiSave = Point.extend({
  id: z.string(),
  kind: z.enum(['home', 'chest', 'weaponPile', 'campfire', 'merchant', 'bladeOil', 'forge', 'grave', 'jewelryBox', 'golem', 'cauldron', 'beehive']),
  used: z.boolean(),
  offer: z.array(Ref).optional(),
  stock: z.array(z.object({ ref: Ref, price: Int.nonnegative(), sold: z.boolean() })).optional(),
  rerollCost: Int.positive().optional(),
  edgeOffer: z.array(z.string()).optional(),
})

const SaveData = z.object({
  version: z.literal(SAVE_VERSION),
  seed: Int,
  rng: Int.nonnegative(),
  week: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  step: Int.nonnegative(),
  player: Point,
  revealed: z.array(z.string()),
  bosses: z.tuple([z.string(), z.string(), z.string()]),
  hero: z.object({
    hp: Int.nonnegative(),
    gold: Int.nonnegative(),
    baseHealth: Int.positive(),
    weapon: Ref.nullable(),
    items: z.array(Ref.nullable()).min(1).max(8),
    oils: z.array(z.enum(['attack', 'armor', 'speed'])).max(3),
    edge: z.string().nullable(),
  }),
  pois: z.array(PoiSave),
  enemies: z.array(Point.extend({ id: z.string(), enemyId: z.string(), alive: z.boolean() })),
})

export type SaveData = z.infer<typeof SaveData>
type RefData = z.infer<typeof Ref>

export type LoadResult = { readonly ok: true; readonly state: RunState } | { readonly ok: false; readonly error: string }

/** Dialogs are fine to save (they reopen from the location); battles and finished runs are not. */
export const isSaveable = (state: RunState): boolean =>
  state.screen.kind !== 'battle' && state.screen.kind !== 'gameOver' && state.screen.kind !== 'victory'

const toRef = (e: Equipped): RefData => (e.tier ? { id: e.item.id, tier: e.tier } : { id: e.item.id })

const poiToSave = (p: Poi): z.infer<typeof PoiSave> => ({
  id: p.id,
  kind: p.kind,
  x: p.x,
  y: p.y,
  used: p.used,
  ...(p.offer ? { offer: p.offer.map(toRef) } : {}),
  ...(p.stock ? { stock: p.stock.map((w) => ({ ref: toRef(w.equipped), price: w.price, sold: w.sold })) } : {}),
  ...(p.rerollCost !== undefined ? { rerollCost: p.rerollCost } : {}),
  ...(p.edgeOffer ? { edgeOffer: p.edgeOffer.map((e) => e.id) } : {}),
})

export const serializeRun = (state: RunState): SaveData => ({
  version: SAVE_VERSION,
  seed: state.seed,
  rng: state.rng.state,
  week: state.week,
  step: state.step,
  player: state.player,
  revealed: [...state.revealed],
  bosses: [...state.bosses],
  hero: {
    hp: state.hero.hp,
    gold: state.hero.gold,
    baseHealth: state.hero.baseHealth,
    weapon: state.hero.weapon ? toRef(state.hero.weapon) : null,
    items: state.hero.items.map((e) => (e ? toRef(e) : null)),
    oils: [...state.hero.oils],
    edge: state.hero.edge?.id ?? null,
  },
  pois: state.world.pois.map(poiToSave),
  enemies: state.world.enemies.map((e) => ({ ...e })),
})

class UnknownContent extends Error {}

const resolver = (content: Content) => {
  const items = new Map<string, ItemDef>([...content.items, ...content.weapons].map((d) => [d.id, d]))
  const edges = new Map<string, EdgeDef>(content.edges.map((e) => [e.id, e]))
  const item = (ref: RefData): Equipped => {
    const def = items.get(ref.id)
    if (!def) throw new UnknownContent(`unknown item "${ref.id}"`)
    return ref.tier ? { item: def, tier: ref.tier } : { item: def }
  }
  const edge = (id: string): EdgeDef => {
    const def = edges.get(id)
    if (!def) throw new UnknownContent(`unknown edge "${id}"`)
    return def
  }
  return { item, edge }
}

const hydrate = (data: SaveData, content: Content): RunState => {
  const { item, edge } = resolver(content)
  for (const e of data.enemies) if (!content.enemies[e.enemyId]) throw new UnknownContent(`unknown enemy "${e.enemyId}"`)
  for (const id of data.bosses) if (!content.bosses.some((b) => b.id === id)) throw new UnknownContent(`unknown boss "${id}"`)

  const generated = generateWorld(data.seed)
  const pois: Poi[] = data.pois.map((p) => ({
    id: p.id,
    kind: p.kind,
    x: p.x,
    y: p.y,
    used: p.used,
    ...(p.offer ? { offer: p.offer.map(item) } : {}),
    ...(p.stock ? { stock: p.stock.map((w) => ({ equipped: item(w.ref), price: w.price, sold: w.sold })) } : {}),
    ...(p.rerollCost !== undefined ? { rerollCost: p.rerollCost } : {}),
    ...(p.edgeOffer ? { edgeOffer: p.edgeOffer.map(edge) } : {}),
  }))

  return {
    seed: data.seed,
    rng: { state: data.rng },
    world: { ...generated, pois, enemies: data.enemies },
    player: data.player,
    week: data.week,
    step: data.step,
    revealed: new Set(data.revealed),
    hero: {
      hp: data.hero.hp,
      gold: data.hero.gold,
      baseHealth: data.hero.baseHealth,
      weapon: data.hero.weapon ? item(data.hero.weapon) : null,
      items: data.hero.items.map((r) => (r ? item(r) : null)),
      oils: data.hero.oils,
      edge: data.hero.edge ? edge(data.hero.edge) : null,
    },
    bosses: data.bosses,
    screen: { kind: 'map' },
  }
}

export const deserializeRun = (raw: unknown, content: Content): LoadResult => {
  const parsed = SaveData.safeParse(raw)
  if (!parsed.success) return { ok: false, error: `invalid save: ${parsed.error.issues[0]?.message ?? 'unknown problem'}` }
  try {
    return { ok: true, state: hydrate(parsed.data, content) }
  } catch (err) {
    if (err instanceof UnknownContent) return { ok: false, error: `save refers to ${err.message}` }
    throw err
  }
}
