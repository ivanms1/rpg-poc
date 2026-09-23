/** What happens when the hero steps onto a location. Rules: docs/research/mechanics.md §8. */
import type { Equipped } from '../items/loadout'
import type { OilKind } from '../items/types'
import type { Rng } from '../rng'
import { nextMorning, timeOfWeek } from '../world/clock'
import type { Poi } from '../world/types'
import { acquire, alreadyHas, blockedReason, heroMaxHp, mergedWeapon, ownedIds, withHealth } from './hero'
import { chestOptions, forgeOptions, graveOptions, jewelryOptions, weaponPileOptions } from './loot'
import { craft, openCauldron, openGolem, visitBeehive } from './crafting'
import { openShop } from './shop'
import type { Content, RunState } from './types'

const CAMPFIRE_HEAL = 10
const FORGE_REPLACE_COST = 10
const OILS: readonly OilKind[] = ['attack', 'armor', 'speed']

type OfferKind = 'chest' | 'weaponPile' | 'grave' | 'jewelryBox'
const TITLES: Record<OfferKind, string> = { chest: 'Treasure Chest', weaponPile: 'Weapon Pile', grave: "Hero's Grave", jewelryBox: 'Jewelry Box' }

const updatePoi = (state: RunState, id: string, patch: Partial<Poi>): RunState => ({
  ...state,
  world: { ...state.world, pois: state.world.pois.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
})

const message = (state: RunState, title: string, text: string): RunState => ({ ...state, screen: { kind: 'message', title, text } })

const rollOffer = (state: RunState, content: Content, kind: OfferKind): [readonly Equipped[], Rng] => {
  const owned = ownedIds(state.hero)
  switch (kind) {
    case 'chest':
      return chestOptions(state.rng, content)
    case 'weaponPile':
      return weaponPileOptions(state.rng, content, owned)
    case 'grave':
      return graveOptions(state.rng, content, owned)
    case 'jewelryBox':
      return jewelryOptions(state.rng, content, owned)
  }
}

/** Cached offers drop unique items the hero picked up elsewhere since; an emptied offer closes the location. */
const openOffer = (state: RunState, content: Content, poi: Poi, kind: OfferKind): RunState => {
  const [rolled, rng] = poi.offer ? [poi.offer, state.rng] : rollOffer(state, content, kind)
  const options = rolled.filter((o) => !alreadyHas(state.hero, o.item))
  if (options.length === 0) return message(updatePoi({ ...state, rng }, poi.id, { used: true }), TITLES[kind], "There's nothing here you don't already have.")
  const withOffer = updatePoi({ ...state, rng }, poi.id, { offer: options })
  return { ...withOffer, screen: { kind: 'choice', poiId: poi.id, title: TITLES[kind], options } }
}

const rest = (state: RunState, sets: Content['sets'], title: string, heal: number, wakeText: string, dayText: string): RunState => {
  if (timeOfWeek(state.step).phase !== 'night') return message(state, title, dayText)
  const hero = withHealth(state.hero, state.hero.hp + heal, sets)
  return { ...message(state, title, wakeText), hero, step: nextMorning(state.step) }
}

const openForge = (state: RunState, content: Content, poi: Poi): RunState => {
  const [options, rng] = poi.edgeOffer ? [poi.edgeOffer, state.rng] : forgeOptions(state.rng, content)
  const cost = state.hero.edge ? FORGE_REPLACE_COST : 0
  return { ...updatePoi({ ...state, rng }, poi.id, { edgeOffer: options }), screen: { kind: 'forge', poiId: poi.id, options, cost } }
}

const openOil = (state: RunState, poi: Poi): RunState => {
  const options = OILS.filter((oil) => !state.hero.oils.includes(oil))
  if (options.length === 0) return message(state, 'Blade Oil', 'Your weapon already carries every oil.')
  return { ...state, screen: { kind: 'oil', poiId: poi.id, options } }
}

const isNight = (state: RunState): boolean => timeOfWeek(state.step).phase === 'night'

export const interact = (state: RunState, content: Content, poi: Poi): RunState => {
  if (poi.used) return state
  switch (poi.kind) {
    case 'chest':
    case 'weaponPile':
    case 'jewelryBox':
      return openOffer(state, content, poi, poi.kind)
    case 'grave':
      return isNight(state)
        ? openOffer(state, content, poi, 'grave')
        : message(state, "Hero's Grave", 'The grave is sealed. It opens at night.')
    case 'merchant':
      return openShop(state, content, poi)
    case 'forge':
      return openForge(state, content, poi)
    case 'bladeOil':
      return openOil(state, poi)
    case 'golem':
      return openGolem(state, poi)
    case 'cauldron':
      return openCauldron(state, content, poi)
    case 'beehive':
      return visitBeehive(state, content, poi)
    case 'campfire':
      return rest(state, content.sets, 'Campfire', CAMPFIRE_HEAL, `You rest by the fire until morning and restore ${CAMPFIRE_HEAL} health.`, 'The embers are warm. Come back at night to rest here.')
    case 'home':
      return rest(state, content.sets, 'Home', heroMaxHp(state.hero, content.sets), 'You sleep soundly at home and wake fully healed.', 'Home. Come back at night to sleep here.')
  }
}

const takeItem = (state: RunState, content: Content, poiId: string, option: Equipped): RunState => {
  if (state.screen.kind !== 'choice') return state
  const blocked = blockedReason(state.hero, option.item)
  if (blocked) return { ...state, screen: { ...state.screen, notice: blocked } }
  const merged = mergedWeapon(state.hero.weapon, option.item, content.merges)
  const hero = acquire(state.hero, option, content.sets, content.merges)
  if (!hero) return { ...state, screen: { ...state.screen, notice: 'Your inventory is full — double-click an item to discard it.' } }
  const taken = updatePoi({ ...state, hero }, poiId, { used: true })
  if (merged && state.hero.weapon) {
    return message(taken, 'Weapons merge', `Your ${state.hero.weapon.item.name} and ${option.item.name} merge into ${merged.name}!`)
  }
  return { ...taken, screen: { kind: 'map' } }
}

/** Takes option `index` on the open chest/pile/grave/box, forge or blade oil. */
export const chooseOption = (state: RunState, content: Content, index: number): RunState => {
  const { screen } = state
  switch (screen.kind) {
    case 'choice': {
      const option = screen.options[index]
      return option ? takeItem(state, content, screen.poiId, option) : state
    }
    case 'forge': {
      const edge = screen.options[index]
      if (!edge) return state
      if (state.hero.gold < screen.cost) return { ...state, screen: { ...screen, notice: `Not enough gold — replacing an edge costs ${screen.cost}.` } }
      const hero = { ...state.hero, edge, gold: state.hero.gold - screen.cost }
      return { ...updatePoi({ ...state, hero }, screen.poiId, { used: true }), screen: { kind: 'map' } }
    }
    case 'oil': {
      const oil = screen.options[index]
      if (!oil) return state
      const hero = { ...state.hero, oils: [...state.hero.oils, oil] }
      return { ...updatePoi({ ...state, hero }, screen.poiId, { used: true }), screen: { kind: 'map' } }
    }
    case 'craft':
      return craft(state, index)
    default:
      return state
  }
}
