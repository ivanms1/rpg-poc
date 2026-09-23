import { useEffect, useRef } from 'react'
import type { Atlas } from '../render/atlas'
import { PALETTE } from '../render/palette'
import { TILE_SIZE } from '../render/tiles'
import { tileAt, type DemoMap, type PoiKind } from './demo/demoMap'
import { ICONS, type Bitmap } from './icons'

/** The real game draws map tiles ~1.35× larger than UI art pixels. */
const MAP_ZOOM = 1.35

const POI_COLOR: Record<PoiKind, string> = { enemy: PALETTE.enemy, shop: PALETTE.shop, shrine: PALETTE.shrine }

interface Props {
  readonly atlas: Atlas | null
  readonly map: DemoMap
  readonly player: { readonly x: number; readonly y: number }
  readonly revealed: ReadonlySet<string>
  /** Canvas size in art pixels. */
  readonly width: number
  readonly height: number
  readonly stageScale: number
}

const drawBitmap = (ctx: CanvasRenderingContext2D, bitmap: Bitmap, x: number, y: number, px: number, color: string) => {
  ctx.fillStyle = color
  bitmap.forEach((line, by) => {
    ;[...line].forEach((ch, bx) => {
      if (ch === '#') ctx.fillRect(x + bx * px, y + by * px, px, px)
    })
  })
}

export function MapCanvas({ atlas, map, player, revealed, width, height, stageScale }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !atlas) return

    const dpr = window.devicePixelRatio || 1
    const deviceScale = stageScale * dpr
    canvas.width = Math.round(width * deviceScale)
    canvas.height = Math.round(height * deviceScale)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const px = Math.max(1, Math.round(deviceScale * MAP_ZOOM))
    const tilePx = TILE_SIZE * px
    const originX = Math.floor(canvas.width / 2 - tilePx / 2 - player.x * tilePx)
    const originY = Math.floor(canvas.height / 2 - tilePx / 2 - player.y * tilePx)
    const x0 = Math.floor(-originX / tilePx)
    const y0 = Math.floor(-originY / tilePx)
    const cols = Math.ceil(canvas.width / tilePx) + 1
    const rows = Math.ceil(canvas.height / tilePx) + 1

    for (let ty = y0; ty < y0 + rows; ty++) {
      for (let tx = x0; tx < x0 + cols; tx++) {
        if (!revealed.has(`${tx},${ty}`)) continue
        const name = tileAt(map, tx, ty)
        if (name) atlas.draw(ctx, name, originX + tx * tilePx, originY + ty * tilePx, tilePx)
      }
    }

    for (const poi of map.pois) {
      if (!revealed.has(`${poi.x},${poi.y}`)) continue
      const x = originX + poi.x * tilePx
      const y = originY + poi.y * tilePx
      const color = POI_COLOR[poi.kind]
      ctx.fillStyle = PALETTE.bg
      ctx.fillRect(x, y, tilePx, tilePx)
      atlas.draw(ctx, poi.tile, x + px, y + px, tilePx - 2 * px, color)
      ctx.strokeStyle = color
      ctx.lineWidth = px
      ctx.strokeRect(x + px / 2, y + px / 2, tilePx - px, tilePx - px)
    }

    const knight = ICONS.knight
    const kx = originX + player.x * tilePx + Math.floor((TILE_SIZE - (knight[0]?.length ?? 0)) / 2) * px
    const ky = originY + player.y * tilePx + Math.floor((TILE_SIZE - knight.length) / 2) * px
    drawBitmap(ctx, knight, kx, ky, px, PALETTE.frame)
  }, [atlas, map, player, revealed, width, height, stageScale])

  return <canvas ref={ref} className="map-canvas" style={{ width, height }} data-testid="map-canvas" />
}
