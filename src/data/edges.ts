/** Forge edges (wiki: Forge_Upgrades). Cleansing Edge is left out until status-gain hooks exist. */
import {
  additionalStrikes,
  damageEnemy,
  earnGold,
  everyNthStrike,
  gain,
  gainStatus,
  giveEnemy,
  hasSpeed,
  restore,
  seq,
  takeDamage,
  when,
} from '../core/effects/dsl'
import type { EdgeDef, SourceSpec } from '../core/items/types'
import { byId, slug } from './define'

const edge = (name: string, text: string, effect: () => SourceSpec): EdgeDef => ({ id: slug(name), name, text, effect })

export const EDGES: readonly EdgeDef[] = [
  edge('Agile Edge', 'Battle Start: Gain 1 additional strike', () => ({ hooks: { battleStart: additionalStrikes(1) } })),
  edge('Bleeding Edge', 'On Hit: Restore 1 health', () => ({ hooks: { onHit: restore(1) } })),
  edge('Blunt Edge', 'On Hit: Gain 1 armor', () => ({ hooks: { onHit: gain('armor', 1) } })),
  edge('Cutting Edge', 'On Hit: Deal 1 damage', () => ({ hooks: { onHit: damageEnemy(1) } })),
  edge('Featherweight Edge', 'On Hit: Convert 1 speed to 1 attack', () => ({
    hooks: { onHit: when(hasSpeed(1), seq(gain('speed', -1), gain('attack', 1))) },
  })),
  edge('Freezing Edge', 'Battle Start: Give the enemy 3 freeze', () => ({ hooks: { battleStart: giveEnemy('freeze', 3) } })),
  edge('Gilded Edge', 'On Hit: If you have less than 10 gold, gain 1 gold', () => ({
    hooks: { onHit: when((s, self) => s.fighters[self].gold < 10, earnGold(1)) },
  })),
  edge('Jagged Edge', 'On Hit: Gain 2 thorns and take 1 damage', () => ({ hooks: { onHit: seq(gainStatus('thorns', 2), takeDamage(1)) } })),
  edge('Oaken Edge', 'Battle Start: Gain 3 regeneration', () => ({ hooks: { battleStart: gainStatus('regen', 3) } })),
  edge('Oozing Edge', "On Hit: If the enemy doesn't have any poison, give them 2 poison", () => ({
    hooks: { onHit: when((s, self) => s.fighters[self === 'player' ? 'enemy' : 'player'].statuses.poison === 0, giveEnemy('poison', 2)) },
  })),
  edge('Petrified Edge', 'Double your attack. On Hit: Gain 1 stun', () => ({
    attackBonus: (s, self) => s.fighters[self].attack,
    hooks: { onHit: gainStatus('stun', 1) },
  })),
  edge('Plated Edge', 'On Hit: Convert 1 speed to 3 armor', () => ({
    hooks: { onHit: when(hasSpeed(1), seq(gain('speed', -1), gain('armor', 3))) },
  })),
  edge('Razor Edge', 'Battle Start: Gain 1 attack', () => ({ hooks: { battleStart: gain('attack', 1) } })),
  edge('Stormcloud Edge', 'Battle Start: Stun the enemy for 1 turn', () => ({ hooks: { battleStart: giveEnemy('stun', 1) } })),
  edge('Whirlpool Edge', 'Every 3 strikes, give the enemy 1 riptide', () => ({ hooks: { onHit: when(everyNthStrike(3), giveEnemy('riptide', 1)) } })),
]

export const EDGES_BY_ID = byId(EDGES)
