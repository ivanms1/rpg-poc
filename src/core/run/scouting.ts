/** Lookout Tower, Crystal Ball, Waypoint, Fairy and Wishing Well. */
import { tileKey, revealAround } from '../world/fog'
import { drawDistinct, randomItem } from './loot'
import { blockedReason, ownedIds, placeItem } from './hero'
import type { Point, Poi, PoiKind } from '../world/types'
import type { Content, PickOption, RunState } from './types'

const LOOKOUT_RADIUS = 11
const CRYSTAL_RADIUS = 3
const CRYSTAL_CHOICES = 3
const WELL_PRICES = { golden: 5, diamond: 10 } as const

export const POI_NAMES: Record<PoiKind, string> = {
  home: 'Home',
  chest: 'Treasure Chest',
  weaponPile: 'Weapon Pile',
  campfire: 'Campfire',
  merchant: 'Traveling Merchant',
  bladeOil: 'Blade Oil',
  forge: 'Forge',
  grave: "Hero's Grave",
  jewelryBox: 'Jewelry Box',
  golem: 'Golem',
  cauldron: 'Cauldron',
  beehive: 'Beehive',
  crystalBall: 'Crystal Ball',
  lookout: 'Lookout Tower',
  waypoint: 'Waypoint',
  fairy: 'Fairy',
  wishingWell: 'Wishing Well',
  tent: 'Bargaining Tent',
  woodcutter: 'Woodcutter',
}

const updatePoi = (state: RunState, id: string, patch: Partial<Poi>): RunState => ({
  ...state,
  world: { ...state.world, pois: state.world.pois.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
})

const message = (state: RunState, title: string, text: string): RunState => ({ ...state, screen: { kind: 'message', title, text } })

/** "far to the north-east" style hint from the hero to a point. */
export const direction = (from: Point, to: Point): string => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const ns = dy < -Math.abs(dx) / 2 ? 'north' : dy > Math.abs(dx) / 2 ? 'south' : ''
  const ew = dx > Math.abs(dy) / 2 ? 'east' : dx < -Math.abs(dy) / 2 ? 'west' : ''
  const distance = Math.abs(dx) + Math.abs(dy)
  const heading = ns && ew ? `${ns}-${ew}` : ns || ew || 'here'
  return `${distance} steps ${heading}`
}

const pick = (state: RunState, poi: Poi, title: string, text: string, purpose: 'reveal' | 'travel' | 'fairy' | 'well', options: readonly PickOption[]): RunState => ({
  ...state,
  screen: { kind: 'pick', poiId: poi.id, title, text, purpose, options },
})

export const visitLookout = (state: RunState, poi: Poi): RunState => {
  const revealed = revealAround(state.revealed, poi.x, poi.y, LOOKOUT_RADIUS)
  return message(updatePoi({ ...state, revealed }, poi.id, { used: true }), 'Lookout Tower', 'From the top of the tower you can see far across the land.')
}

export const openCrystalBall = (state: RunState, poi: Poi): RunState => {
  const unseen = state.world.pois.filter((p) => p.id !== poi.id && p.kind !== 'home' && !p.used && !state.revealed.has(tileKey(p.x, p.y)))
  const [shown, rng] = drawDistinct(state.rng, unseen, CRYSTAL_CHOICES)
  if (shown.length === 0) return message(updatePoi(state, poi.id, { used: true }), 'Crystal Ball', 'The ball is clouded: there is nothing left to find.')
  const options = shown.map((p) => ({ id: p.id, label: `${POI_NAMES[p.kind]} — ${direction(state.player, p)}` }))
  return pick({ ...state, rng }, poi, 'Crystal Ball', 'Choose a vision to reveal.', 'reveal', options)
}

export const openWaypoint = (state: RunState, poi: Poi): RunState => {
  const others = state.world.pois.filter((p) => p.kind === 'waypoint' && p.id !== poi.id)
  if (others.length === 0) return message(state, 'Waypoint', 'This waypoint leads nowhere yet.')
  const options = others.map((p) => ({ id: p.id, label: `Waypoint — ${direction(state.player, p)}` }))
  return pick(state, poi, 'Waypoint', 'Travel instantly to another waypoint.', 'travel', options)
}

export const openFairy = (state: RunState, poi: Poi): RunState => {
  const options = state.hero.items.flatMap((e, slot) => (e ? [{ id: String(slot), label: `Transform ${e.item.name}` }] : []))
  if (options.length === 0) return message(state, 'Fairy', 'The fairy giggles. Bring an item for her to transform.')
  return pick(state, poi, 'Fairy', 'She will turn one item into another of the same rarity.', 'fairy', options)
}

export const openWell = (state: RunState, poi: Poi): RunState =>
  pick(state, poi, 'Wishing Well', 'Toss in some gold and make a wish.', 'well', [
    { id: 'golden', label: `${WELL_PRICES.golden} gold — a Golden item` },
    { id: 'diamond', label: `${WELL_PRICES.diamond} gold — a Diamond item` },
  ])

const withPickNotice = (state: RunState, notice: string): RunState =>
  state.screen.kind === 'pick' ? { ...state, screen: { ...state.screen, notice } } : state

const done = (state: RunState, poiId: string, used: boolean): RunState => ({
  ...(used ? updatePoi(state, poiId, { used: true }) : state),
  screen: { kind: 'map' },
})

/** Resolves the chosen option of the open pick screen. */
export const resolvePick = (state: RunState, content: Content, index: number): RunState => {
  const { screen } = state
  if (screen.kind !== 'pick') return state
  const option = screen.options[index]
  if (!option) return state
  switch (screen.purpose) {
    case 'reveal': {
      const target = state.world.pois.find((p) => p.id === option.id)
      if (!target) return state
      return done({ ...state, revealed: revealAround(state.revealed, target.x, target.y, CRYSTAL_RADIUS) }, screen.poiId, true)
    }
    case 'travel': {
      const target = state.world.pois.find((p) => p.id === option.id)
      if (!target) return state
      return done({ ...state, player: { x: target.x, y: target.y }, revealed: revealAround(state.revealed, target.x, target.y, CRYSTAL_RADIUS) }, screen.poiId, false)
    }
    case 'fairy': {
      const slot = Number(option.id)
      const old = state.hero.items[slot]
      if (!old) return state
      const without = { ...state.hero, items: state.hero.items.map((e, i) => (i === slot ? null : e)) }
      const accept = (candidate: typeof old.item) => candidate.id !== old.item.id && blockedReason(without, candidate) === null
      const [replacement, rng] = randomItem(state.rng, content, old.item.rarity, ownedIds(state.hero), accept)
      if (!replacement) return withPickNotice(state, 'The fairy has nothing to turn it into.')
      const items = state.hero.items.map((e, i) => (i === slot ? { item: replacement, tier: old.tier ?? 'normal' } : e))
      return done({ ...state, rng, hero: { ...state.hero, items } }, screen.poiId, true)
    }
    case 'well': {
      const tier = option.id === 'diamond' ? 'diamond' : 'golden'
      const price = WELL_PRICES[tier]
      if (state.hero.gold < price) return withPickNotice(state, `Not enough gold — that wish costs ${price}.`)
      const [wish, rng] = randomItem(state.rng, content, 'common', ownedIds(state.hero))
      if (!wish || blockedReason(state.hero, wish)) return withPickNotice(state, 'The well stays silent.')
      const hero = placeItem({ ...state.hero, gold: state.hero.gold - price }, { item: wish, tier }, content.sets)
      if (!hero) return withPickNotice(state, 'Your inventory is full — double-click an item to discard it.')
      return done({ ...state, rng, hero }, screen.poiId, true)
    }
  }
}
