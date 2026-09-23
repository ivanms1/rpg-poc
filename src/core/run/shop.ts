/** Traveling Merchant: buy wares for gold, reroll the stock for a rising price. */
import type { Poi } from '../world/types'
import { acquire, blockedReason, ownedIds } from './hero'
import { shopStock } from './loot'
import type { Content, RunState } from './types'

const FIRST_REROLL = 1

const updatePoi = (state: RunState, id: string, patch: Partial<Poi>): RunState => ({
  ...state,
  world: { ...state.world, pois: state.world.pois.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
})

const shopScreen = (poi: Poi & Required<Pick<Poi, 'stock' | 'rerollCost'>>, notice?: string): RunState['screen'] => ({
  kind: 'shop',
  poiId: poi.id,
  stock: poi.stock,
  rerollCost: poi.rerollCost,
  ...(notice ? { notice } : {}),
})

export const openShop = (state: RunState, content: Content, poi: Poi): RunState => {
  if (poi.stock && poi.rerollCost !== undefined) return { ...state, screen: shopScreen({ ...poi, stock: poi.stock, rerollCost: poi.rerollCost }) }
  const [stock, rng] = shopStock(state.rng, content, ownedIds(state.hero))
  const stocked = { ...poi, stock, rerollCost: FIRST_REROLL }
  return { ...updatePoi({ ...state, rng }, poi.id, { stock, rerollCost: FIRST_REROLL }), screen: shopScreen(stocked) }
}

const currentShop = (state: RunState): (Poi & Required<Pick<Poi, 'stock' | 'rerollCost'>>) | null => {
  if (state.screen.kind !== 'shop') return null
  const { poiId } = state.screen
  const poi = state.world.pois.find((p) => p.id === poiId)
  return poi?.stock && poi.rerollCost !== undefined ? { ...poi, stock: poi.stock, rerollCost: poi.rerollCost } : null
}

const withNotice = (state: RunState, notice: string): RunState =>
  state.screen.kind === 'shop' ? { ...state, screen: { ...state.screen, notice } } : state

export const buy = (state: RunState, content: Content, index: number): RunState => {
  const shop = currentShop(state)
  const ware = shop?.stock[index]
  if (!shop || !ware || ware.sold) return state
  const blocked = blockedReason(state.hero, ware.equipped.item)
  if (blocked) return withNotice(state, blocked)
  if (state.hero.gold < ware.price) return withNotice(state, `Not enough gold — ${ware.equipped.item.name} costs ${ware.price}.`)
  const paid = { ...state.hero, gold: state.hero.gold - ware.price }
  const hero = acquire(paid, ware.equipped, content.sets, content.merges)
  if (!hero) return withNotice(state, 'Your inventory is full — double-click an item to discard it.')
  const stock = shop.stock.map((w, i) => (i === index ? { ...w, sold: true } : w))
  const next = updatePoi({ ...state, hero }, shop.id, { stock })
  return { ...next, screen: shopScreen({ ...shop, stock }) }
}

export const reroll = (state: RunState, content: Content): RunState => {
  const shop = currentShop(state)
  if (!shop) return state
  if (state.hero.gold < shop.rerollCost) return withNotice(state, `Not enough gold — a reroll costs ${shop.rerollCost}.`)
  const hero = { ...state.hero, gold: state.hero.gold - shop.rerollCost }
  const [stock, rng] = shopStock(state.rng, content, ownedIds(hero))
  const rerollCost = shop.rerollCost + 1
  const next = updatePoi({ ...state, hero, rng }, shop.id, { stock, rerollCost })
  return { ...next, screen: shopScreen({ ...shop, stock, rerollCost }) }
}
