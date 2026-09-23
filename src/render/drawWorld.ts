/** Draws the visible part of the overworld centred on the hero. Only revealed tiles are drawn (fog of war). */
import { tileKey } from '../core/world/fog'
import { terrainAt } from '../core/world/terrain'
import type { EnemyEntity, Point, Poi, Terrain, World } from '../core/world/types'
import type { Atlas } from './atlas'
import { maskOf } from './autotile'
import { PALETTE } from './palette'
import { TERRAIN_GLYPH } from './terrainStyle'
import { TILE_SIZE, type TileName } from './tiles'

export interface WorldView {
  readonly world: World
  readonly player: Point
  readonly revealed: ReadonlySet<string>
  /** Device pixels per tile pixel. */
  readonly px: number
  readonly heroBitmap: readonly string[]
}

const PATHLIKE: ReadonlySet<Terrain | null> = new Set(['path', 'bridge'])
const WATERLIKE: ReadonlySet<Terrain | null> = new Set(['water', 'bridge'])

const POI_STYLE: Record<Poi['kind'], { readonly tile: TileName; readonly color: string; readonly frame: string }> = {
  home: { tile: 'hut', color: PALETTE.bone, frame: PALETTE.shrine },
  campfire: { tile: 'campfire', color: PALETTE.pumpkin, frame: PALETTE.shop },
  chest: { tile: 'chest', color: PALETTE.shop, frame: PALETTE.shop },
  weaponPile: { tile: 'sword', color: PALETTE.frame, frame: PALETTE.shop },
  merchant: { tile: 'tent', color: PALETTE.gold, frame: PALETTE.gold },
  bladeOil: { tile: 'lamp', color: PALETTE.speed, frame: PALETTE.shop },
  forge: { tile: 'furnace', color: PALETTE.frame, frame: PALETTE.shop },
  grave: { tile: 'grave', color: PALETTE.shrine, frame: PALETTE.shrine },
  jewelryBox: { tile: 'jewelryBox', color: PALETTE.purity, frame: PALETTE.night },
  golem: { tile: 'golem', color: PALETTE.rock, frame: PALETTE.shrine },
  cauldron: { tile: 'cauldron', color: PALETTE.frame, frame: PALETTE.shop },
  beehive: { tile: 'beehive', color: PALETTE.speed, frame: PALETTE.shop },
  crystalBall: { tile: 'crystalBall', color: PALETTE.freeze, frame: PALETTE.night },
  lookout: { tile: 'tower', color: PALETTE.rock, frame: PALETTE.shrine },
  waypoint: { tile: 'flag', color: PALETTE.armor, frame: PALETTE.armor },
  fairy: { tile: 'mushrooms', color: PALETTE.flowers, frame: PALETTE.night },
  wishingWell: { tile: 'well', color: PALETTE.water, frame: PALETTE.night },
  tent: { tile: 'tent', color: PALETTE.shop, frame: PALETTE.gold },
  woodcutter: { tile: 'axe', color: PALETTE.wood, frame: PALETTE.shop },
}

const drawTerrain = (ctx: CanvasRenderingContext2D, atlas: Atlas, world: World, tx: number, ty: number, x: number, y: number, size: number) => {
  const terrain = terrainAt(world.map, tx, ty)
  if (!terrain || terrain === 'ground') return
  const neighbours = (set: ReadonlySet<Terrain | null>) =>
    maskOf((dx, dy) => {
      const t = terrainAt(world.map, tx + dx, ty + dy)
      return t === null || set.has(t)
    })
  if (terrain === 'water' || terrain === 'bridge') atlas.drawAutotile(ctx, neighbours(WATERLIKE), { dots: false }, x, y, size, PALETTE.water)
  if (terrain === 'path') atlas.drawAutotile(ctx, neighbours(PATHLIKE), { dots: true }, x, y, size, PALETTE.path)
  if (terrain === 'bridge') {
    const across = PATHLIKE.has(terrainAt(world.map, tx - 1, ty)) || PATHLIKE.has(terrainAt(world.map, tx + 1, ty))
    atlas.draw(ctx, across ? 'bridgeAcross' : 'bridgeAlong', x, y, size, PALETTE.wood)
  }
  const glyph = TERRAIN_GLYPH[terrain]
  if (glyph) atlas.draw(ctx, glyph.tile, x, y, size, glyph.color)
}

const drawFramed = (ctx: CanvasRenderingContext2D, atlas: Atlas, tile: TileName, color: string, frame: string, x: number, y: number, size: number, px: number) => {
  ctx.fillStyle = PALETTE.bg
  ctx.fillRect(x, y, size, size)
  atlas.draw(ctx, tile, x + px, y + px, size - 2 * px, color)
  ctx.strokeStyle = frame
  ctx.lineWidth = px
  ctx.strokeRect(x + px / 2, y + px / 2, size - px, size - px)
}

const drawBitmap = (ctx: CanvasRenderingContext2D, bitmap: readonly string[], x: number, y: number, px: number, color: string) => {
  ctx.fillStyle = color
  bitmap.forEach((line, by) => [...line].forEach((ch, bx) => ch === '#' && ctx.fillRect(x + bx * px, y + by * px, px, px)))
}

export const drawWorld = (ctx: CanvasRenderingContext2D, atlas: Atlas, view: WorldView): void => {
  const { world, player, revealed, px, heroBitmap } = view
  const { width, height } = ctx.canvas
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, width, height)

  const size = TILE_SIZE * px
  const originX = Math.floor(width / 2 - size / 2 - player.x * size)
  const originY = Math.floor(height / 2 - size / 2 - player.y * size)
  const x0 = Math.floor(-originX / size)
  const y0 = Math.floor(-originY / size)
  const cols = Math.ceil(width / size) + 1
  const rows = Math.ceil(height / size) + 1
  const screen = (p: Point) => ({ x: originX + p.x * size, y: originY + p.y * size })
  const seen = (p: Point) => revealed.has(tileKey(p.x, p.y))

  for (let ty = y0; ty < y0 + rows; ty++) {
    for (let tx = x0; tx < x0 + cols; tx++) {
      if (seen({ x: tx, y: ty })) drawTerrain(ctx, atlas, world, tx, ty, originX + tx * size, originY + ty * size, size)
    }
  }

  for (const poi of world.pois) {
    if (!seen(poi) || poi.used) continue
    const style = POI_STYLE[poi.kind]
    const { x, y } = screen(poi)
    drawFramed(ctx, atlas, style.tile, style.color, style.frame, x, y, size, px)
  }

  const living: readonly EnemyEntity[] = world.enemies.filter((e) => e.alive && seen(e))
  for (const enemy of living) {
    const { x, y } = screen(enemy)
    drawFramed(ctx, atlas, 'skull', PALETTE.enemy, PALETTE.enemy, x, y, size, px)
  }

  const hero = screen(player)
  const w = heroBitmap[0]?.length ?? 0
  drawBitmap(ctx, heroBitmap, hero.x + Math.floor((TILE_SIZE - w) / 2) * px, hero.y + Math.floor((TILE_SIZE - heroBitmap.length) / 2) * px, px, PALETTE.frame)
}
