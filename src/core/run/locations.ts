/** What happens when the hero steps onto a location. Rules: docs/research/mechanics.md §8. */
import { nextMorning, timeOfWeek } from '../world/clock'
import type { Poi } from '../world/types'
import { equipWeapon, heroMaxHp, placeItem, withHealth } from './hero'
import { chestOptions, weaponPileOptions } from './loot'
import type { Content, RunState } from './types'

const CAMPFIRE_HEAL = 10
const TITLES = { chest: 'Treasure Chest', weaponPile: 'Weapon Pile' } as const

const updatePoi = (state: RunState, id: string, patch: Partial<Poi>): RunState => ({
  ...state,
  world: { ...state.world, pois: state.world.pois.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
})

const openOffer = (state: RunState, content: Content, poi: Poi & { kind: 'chest' | 'weaponPile' }): RunState => {
  const [options, rng] = poi.offer ? [poi.offer, state.rng] : (poi.kind === 'chest' ? chestOptions : weaponPileOptions)(state.rng, content)
  const withOffer = updatePoi({ ...state, rng }, poi.id, { offer: options })
  return { ...withOffer, screen: { kind: 'choice', poiId: poi.id, title: TITLES[poi.kind], options } }
}

const rest = (state: RunState, title: string, heal: number, wakeText: string, dayText: string): RunState => {
  if (timeOfWeek(state.step).phase !== 'night') return { ...state, screen: { kind: 'message', title, text: dayText } }
  const hero = withHealth(state.hero, state.hero.hp + heal)
  return { ...state, hero, step: nextMorning(state.step), screen: { kind: 'message', title, text: wakeText } }
}

export const interact = (state: RunState, content: Content, poi: Poi): RunState => {
  switch (poi.kind) {
    case 'chest':
    case 'weaponPile':
      return poi.used ? state : openOffer(state, content, { ...poi, kind: poi.kind })
    case 'campfire':
      return rest(state, 'Campfire', CAMPFIRE_HEAL, `You rest by the fire until morning and restore ${CAMPFIRE_HEAL} health.`, 'The embers are warm. Come back at night to rest here.')
    case 'home':
      return rest(state, 'Home', heroMaxHp(state.hero), 'You sleep soundly at home and wake fully healed.', 'Home. Come back at night to sleep here.')
  }
}

/** Takes option `index` from the open chest/pile. Items need a free slot; weapons replace the current one. */
export const chooseOption = (state: RunState, index: number): RunState => {
  if (state.screen.kind !== 'choice') return state
  const { poiId, options } = state.screen
  const option = options[index]
  if (!option) return state
  const hero = option.item.kind === 'weapon' ? equipWeapon(state.hero, option) : placeItem(state.hero, option)
  if (!hero) return { ...state, screen: { ...state.screen, notice: 'Your inventory is full — double-click an item to discard it.' } }
  return { ...updatePoi({ ...state, hero }, poiId, { used: true }), screen: { kind: 'map' } }
}
