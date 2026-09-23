import { useEffect, useRef } from 'react'
import type { Point, World } from '../../core/world/types'
import type { Atlas } from '../../render/atlas'
import { drawWorld } from '../../render/drawWorld'
import { ICONS } from '../icons'

/** The real game draws map tiles ~1.35× larger than UI art pixels. */
const MAP_ZOOM = 1.35

interface Props {
  readonly atlas: Atlas | null
  readonly world: World
  readonly player: Point
  readonly revealed: ReadonlySet<string>
  /** Canvas size in art pixels. */
  readonly width: number
  readonly height: number
  readonly stageScale: number
}

export function WorldCanvas({ atlas, world, player, revealed, width, height, stageScale }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !atlas) return
    const deviceScale = stageScale * (window.devicePixelRatio || 1)
    canvas.width = Math.round(width * deviceScale)
    canvas.height = Math.round(height * deviceScale)
    const px = Math.max(1, Math.round(deviceScale * MAP_ZOOM))
    drawWorld(ctx, atlas, { world, player, revealed, px, heroBitmap: ICONS.knight })
  }, [atlas, world, player, revealed, width, height, stageScale])

  return <canvas ref={ref} className="map-canvas" style={{ width, height }} data-testid="map-canvas" />
}
