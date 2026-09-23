import { ITEMS_BY_ID } from '../../data/items'
import { WEAPONS_BY_ID } from '../../data/weapons'
import { addSlots, discardItem, equipWeapon, heroCombatant, heroMaxHp, placeItem, withHealth } from './hero'
import type { Hero } from './types'

const vest = { item: ITEMS_BY_ID['leather-vest']! }
const roast = { item: ITEMS_BY_ID['redwood-roast']! }
const hero: Hero = { hp: 20, gold: 3, weapon: { item: WEAPONS_BY_ID['wooden-stick']! }, items: [null, null, null, null], baseHealth: 20 }

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

  it('replaces the weapon', () => {
    expect(equipWeapon(hero, { item: WEAPONS_BY_ID['sword-of-the-hero']! }).weapon?.item.id).toBe('sword-of-the-hero')
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
