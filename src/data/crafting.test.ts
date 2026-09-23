import { CONTENT } from './content'
import { MERGES, RECIPES } from './crafting'
import { ITEMS_BY_ID } from './items'
import { dummy, fight, from, hero, strikes } from './testkit'
import { WEAPONS_BY_ID } from './weapons'

const WOODLAND_FOOD = ['cherry-bomb', 'redwood-roast', 'spiny-chestnut', 'vampiric-wine', 'stone-steak', 'honeycomb']

describe('cauldron recipes', () => {
  it('cover every pair of different Woodland foods and honeycomb (15 dishes)', () => {
    expect(RECIPES).toHaveLength(15)
    for (let i = 0; i < WOODLAND_FOOD.length; i++) {
      for (let j = i + 1; j < WOODLAND_FOOD.length; j++) {
        const [a, b] = [WOODLAND_FOOD[i]!, WOODLAND_FOOD[j]!]
        expect(RECIPES.some((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))).toBe(true)
      }
    }
  })

  it('dishes, honeycomb and merged weapons never drop from normal loot', () => {
    for (const r of [...RECIPES, ...MERGES]) expect(r.result.drop).toBe(false)
    expect(ITEMS_BY_ID['honeycomb']?.drop).toBe(false)
    expect(CONTENT.items).toContain(RECIPES[0]!.result)
  })

  const dish = (id: string) => RECIPES.find((r) => r.result.id === id)!.result.id

  it.each([
    ['sugar-bomb', 'Sugar Bomb', 3],
    ['explosive-roast', 'Explosive Roast', 3],
    ['trail-mix', 'Trail Mix', 4],
  ])('%s triggers its bombs', (id, name, count) => {
    expect(from(fight(hero('wooden-stick', [dish(id)]), dummy()).events, name).length).toBeGreaterThanOrEqual(count)
  })

  it('Granite Cherry: at full health, 2 armor and 2 damage three times', () => {
    expect(from(fight(hero('wooden-stick', ['granite-cherry']), dummy()).events, 'Granite Cherry')).toHaveLength(6)
  })

  it('Cherry Cocktail: 3 damage and 3 health at Battle Start and Wounded', () => {
    const r = fight(hero('wooden-stick', ['cherry-cocktail'], { hp: 5 }), dummy(100, 2, 0, 5))
    expect(from(r.events, 'Cherry Cocktail').filter((e) => e.type === 'heal').length).toBeGreaterThanOrEqual(1)
  })

  it('Honey Ham doubles max health; Rock Roast adds 6 health and 6 armor', () => {
    expect(hero('wooden-stick', ['honey-ham']).stats.maxHp).toBe(20)
    expect(hero('wooden-stick', ['rock-roast']).stats).toMatchObject({ maxHp: 16, armor: 6 })
  })

  it('Candied Nuts: 3 thorns that deal double damage', () => {
    const r = fight(hero('wooden-stick', ['candied-nuts']), dummy(100, 1, 0, 5))
    expect(from(r.events, 'Hero thorns')[0]).toMatchObject({ amount: 6 })
  })

  it('Rock Candy: 15 armor, 30 at full health', () => {
    expect(fight(hero('wooden-stick', ['rock-candy']), dummy()).events.find((e) => e.type === 'turnStart')?.snapshot.player.armor).toBe(30)
    expect(fight(hero('wooden-stick', ['rock-candy'], { hp: 5 }), dummy()).events.find((e) => e.type === 'turnStart')?.snapshot.player.armor).toBe(15)
  })

  it.each([
    ['sweet-wine', 'Sweet Wine'],
    ['blood-sausage', 'Blood Sausage'],
    ['spiked-wine', 'Spiked Wine'],
    ['bloody-steak', 'Bloody Steak'],
  ])('%s heals when wounded', (id, name) => {
    const r = fight(hero('wooden-stick', [id], { baseHealth: 30 }), dummy(100, 4, 0, 5))
    expect(from(r.events, name).some((e) => e.type === 'heal')).toBe(true)
  })

  it('Roasted Chestnut and Petrified Chestnut grant thorns', () => {
    expect(from(fight(hero('wooden-stick', ['roasted-chestnut']), dummy()).events, 'Roasted Chestnut')[0]).toMatchObject({ status: 'thorns', delta: 4 })
    expect(from(fight(hero('wooden-stick', ['petrified-chestnut']), dummy()).events, 'Petrified Chestnut').map((e) => e.type)).toEqual(['status', 'stat'])
  })
})

describe('weapon merges', () => {
  it('Boom Spear and Brittlebark Blade', () => {
    expect(MERGES.map((m) => m.result.id).sort()).toEqual(['boom-spear', 'brittlebark-blade'])
    const spear = fight(hero('boom-spear'), dummy()).events
    expect(from(spear, 'Boom Spear').map((e) => e.type).slice(0, 2)).toEqual(['status', 'damage'])
    expect(strikes(fight(hero('brittlebark-blade'), dummy(100)).events, 'player').slice(0, 2)).toEqual([12, 10])
    expect(WEAPONS_BY_ID['boom-spear']?.drop).toBe(false)
  })
})
