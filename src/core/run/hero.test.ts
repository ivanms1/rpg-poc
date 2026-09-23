import { ITEMS_BY_ID } from '../../data/items'
import { WEAPONS_BY_ID } from '../../data/weapons'
import { EDGES_BY_ID } from '../../data/edges'
import { SETS } from '../../data/sets'
import { addSlots, discardItem, equipWeapon, heroCombatant, heroMaxHp, placeItem, swapSlots, withHealth } from './hero'
import type { Hero } from './types'

const vest = { item: ITEMS_BY_ID['leather-vest']! }
const roast = { item: ITEMS_BY_ID['redwood-roast']! }
const hero: Hero = { hp: 20, gold: 3, weapon: { item: WEAPONS_BY_ID['wooden-stick']! }, items: [null, null, null, null], baseHealth: 20, oils: [], edge: null }

describe('hero inventory', () => {
  it('places an item in the first empty slot', () => {
    const next = placeItem({ ...hero, items: [vest, null, null, null] }, roast)
    expect(next?.items.map((e) => e?.item.id ?? null)).toEqual(['leather-vest', 'redwood-roast', null, null])
  })

  it('returns null when every slot is full', () => {
    expect(placeItem({ ...hero, items: [vest, vest] }, roast)).toBeNull()
  })

  it('discards by slot, ignoring bad indexes', () => {
    const full = { ...hero, items: [vest, roast] }
    expect(discardItem(full, 0).items).toEqual([null, roast])
    expect(discardItem(full, 7)).toBe(full)
  })

  it('adds locked slots as empty ones', () => {
    expect(addSlots(hero, 2).items).toHaveLength(6)
  })

  it('replaces the weapon, losing its oils and edge', () => {
    const upgraded = { ...hero, oils: ['attack' as const], edge: EDGES_BY_ID['razor-edge']! }
    const next = equipWeapon(upgraded, { item: WEAPONS_BY_ID['sword-of-the-hero']! })
    expect(next.weapon?.item.id).toBe('sword-of-the-hero')
    expect(next).toMatchObject({ oils: [], edge: null })
  })

  it('swaps two slots (including empty ones) and ignores bad indexes', () => {
    const s = { ...hero, items: [vest, null, roast, null] }
    expect(swapSlots(s, 0, 2).items).toEqual([roast, null, vest, null])
    expect(swapSlots(s, 0, 1).items).toEqual([null, vest, roast, null])
    expect(swapSlots(s, 0, 9)).toBe(s)
    expect(swapSlots(s, 1, 1)).toBe(s)
  })

  it('applies oils, edge and complete sets in battle stats', () => {
    const heroKit: Hero = {
      ...hero,
      weapon: { item: WEAPONS_BY_ID['sword-of-the-hero']! },
      items: [{ item: ITEMS_BY_ID['boots-of-the-hero']! }, { item: ITEMS_BY_ID['shield-of-the-hero']! }],
      oils: ['speed'],
      edge: EDGES_BY_ID['razor-edge']!,
    }
    const c = heroCombatant(heroKit, SETS)
    expect(c.stats).toMatchObject({ attack: 5, armor: 5, speed: 5 })
    expect(c.sources.map((src) => src.kind)).toEqual(['weapon', 'edge', 'item', 'item', 'set'])
  })

  it('gear that raises max health also raises current health; losing it caps health', () => {
    const fed = placeItem({ ...hero, hp: 12 }, roast)!
    expect(heroMaxHp(fed)).toBe(25)
    expect(fed.hp).toBe(17)
    expect(withHealth(fed, 99).hp).toBe(25)
    expect(withHealth(fed, -3).hp).toBe(0)
    const dropped = discardItem({ ...fed, hp: 25 }, 0)
    expect(dropped.hp).toBe(20)
  })

  it('builds a combatant with current health and gold', () => {
    const c = heroCombatant({ ...hero, hp: 7 })
    expect(c).toMatchObject({ hp: 7, gold: 3, stats: { maxHp: 20, attack: 1 } })
  })
})
