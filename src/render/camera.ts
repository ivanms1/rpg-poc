import type { Point } from '../core/world/types'
import { TILE_SIZE } from './tiles'

/** Where the map is drawn: tile size in device pixels and the origin that centres `focus`. */
export interface Camera {
  readonly size: number
  readonly originX: number
  readonly originY: number
  /** First visible tile and how many fit (plus one for partial tiles). */
  readonly x0: number
  readonly y0: number
  readonly cols: number
  readonly rows: number
}

/** `px` = device pixels per tile pixel. The focus tile's centre sits at the canvas centre. */
export const cameraFor = (width: number, height: number, px: number, focus: Point): Camera => {
  const size = TILE_SIZE * px
  const originX = Math.floor(width / 2 - size / 2 - focus.x * size)
  const originY = Math.floor(height / 2 - size / 2 - focus.y * size)
  return {
    size,
    originX,
    originY,
    x0: Math.floor(-originX / size),
    y0: Math.floor(-originY / size),
    cols: Math.ceil(width / size) + 1,
    rows: Math.ceil(height / size) + 1,
  }
}

export const tileToScreen = (cam: Camera, p: Point): Point => ({ x: cam.originX + p.x * cam.size, y: cam.originY + p.y * cam.size })

export const screenToTile = (cam: Camera, x: number, y: number): Point => ({
  x: Math.floor((x - cam.originX) / cam.size),
  y: Math.floor((y - cam.originY) / cam.size),
})

export interface Bounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

/** Bounding box of "x,y" tile keys, or null for none. */
export const boundsOf = (keys: Iterable<string>): Bounds | null => {
  let b: Bounds | null = null
  for (const key of keys) {
    const [x = 0, y = 0] = key.split(',').map(Number)
    b = b ? { minX: Math.min(b.minX, x), minY: Math.min(b.minY, y), maxX: Math.max(b.maxX, x), maxY: Math.max(b.maxY, y) } : { minX: x, minY: y, maxX: x, maxY: y }
  }
  return b
}

/** Largest whole zoom (1…maxPx) that fits `bounds` plus a tile of margin, centred on it. */
export const fitBounds = (width: number, height: number, bounds: Bounds, maxPx: number): { px: number; focus: Point } => {
  const cols = bounds.maxX - bounds.minX + 3
  const rows = bounds.maxY - bounds.minY + 3
  const fit = Math.floor(Math.min(width / (cols * TILE_SIZE), height / (rows * TILE_SIZE)))
  return {
    px: Math.max(1, Math.min(maxPx, fit)),
    focus: { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
  }
}
