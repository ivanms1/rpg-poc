/** Golem (merge two identical commons up a tier), Cauldron (cook two foods), Woodcutter (two items → a heroic) and Beehive. */
import type { Equipped } from '../items/loadout'
import type { Tier } from '../items/types'
import type { Poi } from '../world/types'
import { ownedIds, placeItem } from './hero'
import { randomItem } from './loot'
import type { Content, CraftOption, RunState } from './types'

const NEXT_TIER: Partial<Record<Tier, Tier>> = { normal: 'golden', golden: 'diamond' }
const HONEYCOMB = 'honeycomb'

const updatePoi = (state: RunState, id: string, patch: Partial<Poi>): RunState => ({
  ...state,
  world: { ...state.world, pois: state.world.pois.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
})

const message = (state: RunState, title: string, text: string): RunState => ({ ...state, screen: { kind: 'message', title, text } })

type Filled = { readonly slot: number; readonly equipped: Equipped }
const filled = (state: RunState): readonly Filled[] =>
  state.hero.items.flatMap((equipped, slot) => (equipped ? [{ slot, equipped }] : []))

/** Each first pair of identical common items (same tier, below diamond). */
export const golemOptions = (state: RunState): readonly CraftOption[] => {
  const items = filled(state)
  return items.flatMap(({ slot, equipped }, i) => {
    const tier = equipped.tier ?? 'normal'
    const next = NEXT_TIER[tier]
    if (!next || equipped.item.rarity !== 'common') return []
    const twin = items.slice(i + 1).find((o) => o.equipped.item.id === equipped.item.id && (o.equipped.tier ?? 'normal') === tier)
    const earlier = items.slice(0, i).some((o) => o.equipped.item.id === equipped.item.id && (o.equipped.tier ?? 'normal') === tier)
    return twin && !earlier ? [{ result: { item: equipped.item, tier: next }, slots: [slot, twin.slot] as const }] : []
  })
}

/** Every recipe the hero can cook from two different items they carry. */
export const cauldronOptions = (state: RunState, content: Content): readonly CraftOption[] => {
  const items = filled(state)
  return content.recipes.flatMap((r) => {
    const a = items.find((f) => f.equipped.item.id === r.a)
    const b = items.find((f) => f.equipped.item.id === r.b && f.slot !== a?.slot)
    return a && b ? [{ result: { item: r.result }, slots: [a.slot, b.slot] as const }] : []
  })
}

export const openGolem = (state: RunState, poi: Poi): RunState => {
  const options = golemOptions(state)
  if (options.length === 0) return message(state, 'Golem', 'The golem can fuse two identical common items into a stronger one. Bring a pair.')
  return { ...state, screen: { kind: 'craft', poiId: poi.id, title: 'Golem', options } }
}

export const openCauldron = (state: RunState, content: Content, poi: Poi): RunState => {
  const options = cauldronOptions(state, content)
  if (options.length === 0) return message(state, 'Cauldron', 'Bring two different foods (or a food and a honeycomb) to cook them together.')
  return { ...state, screen: { kind: 'craft', poiId: poi.id, title: 'Cauldron', options } }
}

export const visitBeehive = (state: RunState, content: Content, poi: Poi): RunState => {
  const honeycomb = content.items.find((i) => i.id === HONEYCOMB)
  if (!honeycomb) return state
  const hero = placeItem(state.hero, { item: honeycomb }, content.sets)
  if (!hero) return message(state, 'Beehive', 'There is honeycomb here, but your inventory is full.')
  return message(updatePoi({ ...state, hero }, poi.id, { used: true }), 'Beehive', 'You carefully collect a Honeycomb.')
}

const WOODCUTTER_PAIRS = 6

/** Up to 6 pairs of carried items, each pre-rolled to a hidden heroic item. */
export const openWoodcutter = (state: RunState, content: Content, poi: Poi): RunState => {
  const items = filled(state)
  const pairs = items.flatMap((a, i) => items.slice(i + 1).map((b) => [a.slot, b.slot] as const)).slice(0, WOODCUTTER_PAIRS)
  if (pairs.length === 0) return message(state, 'Woodcutter', 'Bring two items and the woodcutter will carve them into something heroic.')
  let rng = state.rng
  const options: CraftOption[] = []
  for (const slots of pairs) {
    const [heroic, next] = randomItem(rng, content, 'heroic', ownedIds(state.hero))
    rng = next
    if (heroic) options.push({ result: { item: heroic }, slots, hidden: true })
  }
  if (options.length === 0) return message(state, 'Woodcutter', 'The woodcutter has nothing left to carve.')
  return { ...state, rng, screen: { kind: 'craft', poiId: poi.id, title: 'Woodcutter', options } }
}

/** Applies craft option `index`: the cauldron can be used again, the golem and woodcutter can't. */
export const craft = (state: RunState, index: number): RunState => {
  if (state.screen.kind !== 'craft') return state
  const option = state.screen.options[index]
  if (!option) return state
  const [keep, consume] = option.slots
  const items = state.hero.items.map((e, i) => (i === keep ? option.result : i === consume ? null : e))
  const next = { ...state, hero: { ...state.hero, items }, screen: { kind: 'map' as const } }
  return state.screen.title === 'Cauldron' ? next : updatePoi(next, state.screen.poiId, { used: true })
}
