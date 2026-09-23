import { blocksMovement, isWalkable } from './terrain'
import type { Terrain, WorldMap } from './types'

describe('terrain', () => {
  it('only paths and bridges can be walked on, as in the original', () => {
    const walkable: Terrain[] = ['path', 'bridge']
    const blocked: Terrain[] = ['ground', 'water', 'pine', 'pines', 'rock', 'deadTree', 'bush', 'tuft', 'sprouts', 'tallGrass', 'flowers', 'stones']
    for (const t of walkable) expect(blocksMovement(t)).toBe(false)
    for (const t of blocked) expect(blocksMovement(t)).toBe(true)
  })

  it('treats out-of-bounds as blocked', () => {
    const map: WorldMap = { width: 1, height: 1, terrain: ['path'], biome: ['start'] }
    expect(isWalkable(map, 0, 0)).toBe(true)
    expect(isWalkable(map, 1, 0)).toBe(false)
    expect(isWalkable(map, 0, -1)).toBe(false)
  })
})
