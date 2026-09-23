import type { Content } from '../core/run/types'
import { BOSSES } from './bosses'
import { MERGES, RECIPES } from './crafting'
import { EDGES } from './edges'
import { ENEMIES_BY_ID } from './enemies'
import { ITEMS } from './items'
import { SETS } from './sets'
import { WEAPONS, WEAPONS_BY_ID } from './weapons'

const startingWeapon = WEAPONS_BY_ID['wooden-stick']
if (!startingWeapon) throw new Error('content: missing Wooden Stick')

/** Everything a Woodland run draws from. */
export const CONTENT: Content = {
  items: ITEMS,
  weapons: WEAPONS,
  enemies: ENEMIES_BY_ID,
  bosses: BOSSES,
  sets: SETS,
  edges: EDGES,
  recipes: RECIPES,
  merges: MERGES,
  startingWeapon,
}
