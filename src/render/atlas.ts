import { autotileBitmap, type AutotileStyle } from './autotile'
import { PALETTE } from './palette'
import { TILE_SIZE, TILES, type TileName } from './tiles'

/**
 * Slices the white-on-transparent 1-bit sheet and tints tiles on demand.
 * Tinted tiles are memoised per (tile, colour) so each is rasterised once.
 */
export interface Atlas {
  draw(ctx: CanvasRenderingContext2D, name: TileName, x: number, y: number, size: number, color?: string): void
  /** Procedural path/water tile for a neighbour mask (see render/autotile.ts). */
  drawAutotile(ctx: CanvasRenderingContext2D, mask: number, style: AutotileStyle, x: number, y: number, size: number, color: string): void
}

export const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })

const blankTile = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const canvas = document.createElement('canvas')
  canvas.width = TILE_SIZE
  canvas.height = TILE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('atlas: 2D context unavailable')
  return [canvas, ctx]
}

const paintBitmap = (bitmap: readonly boolean[], color: string): HTMLCanvasElement => {
  const [canvas, ctx] = blankTile()
  ctx.fillStyle = color
  bitmap.forEach((on, i) => on && ctx.fillRect(i % TILE_SIZE, Math.floor(i / TILE_SIZE), 1, 1))
  return canvas
}

const tint = (sheet: HTMLImageElement, col: number, row: number, color: string): HTMLCanvasElement => {
  const [canvas, ctx] = blankTile()
  ctx.drawImage(sheet, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
  return canvas
}

export const createAtlas = (sheet: HTMLImageElement): Atlas => {
  const cache = new Map<string, HTMLCanvasElement>()

  const get = (name: TileName, color: string): HTMLCanvasElement => {
    const def = TILES[name]
    const key = `${def.col},${def.row},${color}`
    const hit = cache.get(key)
    if (hit) return hit
    const tinted = tint(sheet, def.col, def.row, color)
    cache.set(key, tinted)
    return tinted
  }

  const getAutotile = (mask: number, style: AutotileStyle, color: string): HTMLCanvasElement => {
    const key = `auto:${mask}:${style.dots}:${color}`
    const hit = cache.get(key)
    if (hit) return hit
    const painted = paintBitmap(autotileBitmap(mask, style), color)
    cache.set(key, painted)
    return painted
  }

  return {
    draw(ctx, name, x, y, size, color) {
      ctx.drawImage(get(name, color ?? PALETTE[TILES[name].color]), x, y, size, size)
    },
    drawAutotile(ctx, mask, style, x, y, size, color) {
      ctx.drawImage(getAutotile(mask, style, color), x, y, size, size)
    },
  }
}
