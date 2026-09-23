/** Draws the visible part of the overworld centred on the hero. Only revealed tiles are drawn (fog of war). */
import { tileKey } from '../core/world/fog'
import { terrainAt } from '../core/world/terrain'
import type { EnemyEntity, Point, Poi, Terrain, World } from '../core/world/types'
import type { Atlas } from './atlas'
import { cameraFor, tileToScreen, type Camera } from './camera'
import { CREATURE_SPRITES } from './creatures'
import { maskOf } from './autotile'
import { PALETTE } from './palette'
import { TERRAIN_GLYPH } from './terrainStyle'
import { TILE_SIZE, type TileName } from './tiles'

export interface WorldView {
  readonly world: World
  readonly player: Point
  /** Which "x,y" tiles are out of the fog (a Set, or the reveal animation's in-between state). */
  readonly revealed: { readonly has: (key: string) => boolean }
  /** Device pixels per tile pixel. */
  readonly px: number
  readonly heroBitmap: readonly string[]
  /** Tile at the canvas centre (defaults to the player; the Shift overview uses the explored area's centre). */
  readonly focus?: Point
  /** 0–1: how far the land has withered as He draws near (see `withering`). */
  readonly decay?: number
  /** 0–1 flash over tiles that were just revealed. */
  readonly glow?: (key: string) => number
}

const REMAINS_ALPHA = 0.45
/** Brightest a freshly revealed tile flashes. */
const GLOW_ALPHA = 0.6

const drawGlow = (ctx: CanvasRenderingContext2D, cam: Camera, glow: (key: string) => number) => {
  ctx.fillStyle = PALETTE.bone
  for (let ty = cam.y0; ty < cam.y0 + cam.rows; ty++) {
    for (let tx = cam.x0; tx < cam.x0 + cam.cols; tx++) {
      const g = glow(tileKey(tx, ty))
      if (g <= 0) continue
      ctx.globalAlpha = GLOW_ALPHA * Math.min(1, g)
      ctx.fillRect(cam.originX + tx * cam.size, cam.originY + ty * cam.size, cam.size, cam.size)
    }
  }
  ctx.globalAlpha = 1
}
/** Tint strength at full decay. */
const DECAY_ALPHA = 0.35

/** Tints only what's already drawn (the terrain), leaving fog and markers alone. */
const drawDecay = (ctx: CanvasRenderingContext2D, decay: number) => {
  if (decay <= 0) return
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = DECAY_ALPHA * Math.min(1, decay)
  ctx.fillStyle = PALETTE.decay
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
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

/** A live enemy: its red 8×8 sprite on a dark tile, unframed so the art stays legible (a skull if it has no art). */
const drawEnemy = (ctx: CanvasRenderingContext2D, atlas: Atlas, enemy: EnemyEntity, x: number, y: number, size: number, px: number) => {
  const sprite = CREATURE_SPRITES[enemy.enemyId]
  const inner = TILE_SIZE - 2
  const w = sprite?.bitmap[0]?.length ?? 0
  // Boss-sized art (12×12) doesn't fit a tile.
  if (!sprite || w > inner || sprite.bitmap.length > inner) return drawFramed(ctx, atlas, 'skull', PALETTE.enemy, PALETTE.enemy, x, y, size, px)
  ctx.fillStyle = PALETTE.bg
  ctx.fillRect(x, y, size, size)
  drawBitmap(ctx, sprite.bitmap, x + (1 + Math.floor((inner - w) / 2)) * px, y + (1 + Math.floor((inner - sprite.bitmap.length) / 2)) * px, px, PALETTE.enemy)
}

/** Used locations and fallen enemies leave faint remains, so paths never seem to lead nowhere. */
const drawRemains = (ctx: CanvasRenderingContext2D, atlas: Atlas, tile: TileName, color: string, x: number, y: number, size: number, px: number) => {
  ctx.globalAlpha = REMAINS_ALPHA
  atlas.draw(ctx, tile, x + px, y + px, size - 2 * px, color)
  ctx.globalAlpha = 1
}

export const drawWorld = (ctx: CanvasRenderingContext2D, atlas: Atlas, view: WorldView): Camera => {
  const { world, player, revealed, px, heroBitmap } = view
  const { width, height } = ctx.canvas
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, width, height)

  const cam = cameraFor(width, height, px, view.focus ?? player)
  const { size } = cam
  const screen = (p: Point) => tileToScreen(cam, p)
  const seen = (p: Point) => revealed.has(tileKey(p.x, p.y))

  for (let ty = cam.y0; ty < cam.y0 + cam.rows; ty++) {
    for (let tx = cam.x0; tx < cam.x0 + cam.cols; tx++) {
      if (seen({ x: tx, y: ty })) drawTerrain(ctx, atlas, world, tx, ty, cam.originX + tx * size, cam.originY + ty * size, size)
    }
  }

  drawDecay(ctx, view.decay ?? 0)

  for (const poi of world.pois) {
    if (!seen(poi)) continue
    const style = POI_STYLE[poi.kind]
    const { x, y } = screen(poi)
    if (poi.used) drawRemains(ctx, atlas, style.tile, style.color, x, y, size, px)
    else drawFramed(ctx, atlas, style.tile, style.color, style.frame, x, y, size, px)
  }

  const visible: readonly EnemyEntity[] = world.enemies.filter((e) => seen(e))
  for (const enemy of visible) {
    const { x, y } = screen(enemy)
    if (enemy.alive) drawEnemy(ctx, atlas, enemy, x, y, size, px)
    else drawRemains(ctx, atlas, 'skull', PALETTE.bone, x, y, size, px)
  }

  if (view.glow) drawGlow(ctx, cam, view.glow)

  const hero = screen(player)
  const w = heroBitmap[0]?.length ?? 0
  drawBitmap(ctx, heroBitmap, hero.x + Math.floor((TILE_SIZE - w) / 2) * px, hero.y + Math.floor((TILE_SIZE - heroBitmap.length) / 2) * px, px, PALETTE.frame)
  return cam
}
