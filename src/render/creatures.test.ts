import { CONTENT } from '../data/content'
import { CREATURE_SPRITES } from './creatures'

const sizeOf = (bitmap: readonly string[]) => ({ w: bitmap[0]?.length ?? 0, h: bitmap.length })
const ENEMY_IDS = Object.keys(CONTENT.enemies)

describe('creature sprites', () => {
  it.each(ENEMY_IDS)('enemy %s has an 8×8 sprite', (id) => {
    const sprite = CREATURE_SPRITES[id]
    expect(sprite).toBeDefined()
    expect(sizeOf(sprite!.bitmap)).toEqual({ w: 8, h: 8 })
  })

  it.each(CONTENT.bosses.map((b) => b.id))('boss %s has a 12×12 sprite', (id) => {
    const sprite = CREATURE_SPRITES[id]
    expect(sprite).toBeDefined()
    expect(sizeOf(sprite!.bitmap)).toEqual({ w: 12, h: 12 })
  })

  it('every bitmap is rectangular and uses only # and .', () => {
    for (const [id, { bitmap, color }] of Object.entries(CREATURE_SPRITES)) {
      const { w } = sizeOf(bitmap)
      for (const row of bitmap) expect([id, row.length, /^[#.]+$/.test(row)]).toEqual([id, w, true])
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
