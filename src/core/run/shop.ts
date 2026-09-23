/** Traveling Merchant (buy, reroll for a rising price) and Bargaining Tent (2 wares, haggle once). */
import { nextFloat } from '../rng'
import type { Poi, Ware } from '../world/types'
import { acquire, blockedReason, ownedIds, INVENTORY_FULL } from './hero'
import { shopStock, tentStock } from './loot'
import type { Content, RunState } from './types'

const FIRST_REROLL = 1
const HAGGLE_GOOD_ODDS = 0.75
const HAGGLE_GOOD_PRICE = 4
const HAGGLE_BAD_PRICE = 7

const updatePoi = (state: RunState, id: string, patch: Partial<Poi>): RunState => ({
  ...state,
  world: { ...state.world, pois: state.world.pois.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
})

const isTent = (poi: Poi): boolean => poi.kind === 'tent'

const shopScreen = (poi: Poi, stock: readonly Ware[], notice?: string): RunState['screen'] => ({
  kind: 'shop',
  poiId: poi.id,
  title: isTent(poi) ? 'Bargaining Tent' : 'Traveling Merchant',
  stock,
  rerollCost: isTent(poi) ? null : (poi.rerollCost ?? FIRST_REROLL),
  canHaggle: isTent(poi) && !poi.haggled,
  ...(notice ? { notice } : {}),
})

export const openShop = (state: RunState, content: Content, poi: Poi): RunState => {
  if (poi.stock) return { ...state, screen: shopScreen(poi, poi.stock) }
  const [stock, rng] = (isTent(poi) ? tentStock : shopStock)(state.rng, content, ownedIds(state.hero))
  const stocked = { ...poi, stock, ...(isTent(poi) ? {} : { rerollCost: FIRST_REROLL }) }
  return { ...updatePoi({ ...state, rng }, poi.id, stocked), screen: shopScreen(stocked, stock) }
}

const currentShop = (state: RunState): (Poi & { stock: readonly Ware[] }) | null => {
  if (state.screen.kind !== 'shop') return null
  const { poiId } = state.screen
  const poi = state.world.pois.find((p) => p.id === poiId)
  return poi?.stock ? { ...poi, stock: poi.stock } : null
}

const withNotice = (state: RunState, notice: string): RunState =>
  state.screen.kind === 'shop' ? { ...state, screen: { ...state.screen, notice } } : state

const restock = (state: RunState, shop: Poi, patch: Partial<Poi> & { stock: readonly Ware[] }): RunState => {
  const updated = { ...shop, ...patch }
  return { ...updatePoi(state, shop.id, patch), screen: shopScreen(updated, patch.stock) }
}

export const buy = (state: RunState, content: Content, index: number): RunState => {
  const shop = currentShop(state)
  const ware = shop?.stock[index]
  if (!shop || !ware || ware.sold) return state
  const blocked = blockedReason(state.hero, ware.equipped.item)
  if (blocked) return withNotice(state, blocked)
  if (state.hero.gold < ware.price) return withNotice(state, `Not enough gold — ${ware.equipped.item.name} costs ${ware.price}.`)
  const paid = { ...state.hero, gold: state.hero.gold - ware.price }
  const hero = acquire(paid, ware.equipped, content.sets, content.merges)
  if (!hero) return withNotice(state, INVENTORY_FULL)
  return restock({ ...state, hero }, shop, { stock: shop.stock.map((w, i) => (i === index ? { ...w, sold: true } : w)) })
}

export const reroll = (state: RunState, content: Content): RunState => {
  const shop = currentShop(state)
  if (!shop || isTent(shop)) return state
  const cost = shop.rerollCost ?? FIRST_REROLL
  if (state.hero.gold < cost) return withNotice(state, `Not enough gold — a reroll costs ${cost}.`)
  const hero = { ...state.hero, gold: state.hero.gold - cost }
  const [stock, rng] = shopStock(state.rng, content, ownedIds(hero))
  return restock({ ...state, hero, rng }, shop, { stock, rerollCost: cost + 1 })
}

/** Bargaining Tent: one haggle per tent — usually a discount, sometimes a markup. */
export const haggle = (state: RunState): RunState => {
  const shop = currentShop(state)
  if (!shop || !isTent(shop) || shop.haggled) return state
  const [roll, rng] = nextFloat(state.rng)
  const price = roll < HAGGLE_GOOD_ODDS ? HAGGLE_GOOD_PRICE : HAGGLE_BAD_PRICE
  const stock = shop.stock.map((w) => (w.sold ? w : { ...w, price }))
  const notice = price === HAGGLE_GOOD_PRICE ? 'The trader grumbles and lowers the price.' : 'The trader takes offence and raises the price!'
  const next = restock({ ...state, rng }, shop, { stock, haggled: true })
  return withNotice(next, notice)
}
