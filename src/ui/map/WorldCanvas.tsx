import { useEffect, useMemo, useRef } from 'react'
import type { Point, World } from '../../core/world/types'
import type { Atlas } from '../../render/atlas'
import { boundsOf, fitBounds, screenToTile, type Camera } from '../../render/camera'
import { drawWorld } from '../../render/drawWorld'
import { ICONS } from '../icons'

/** The real game draws map tiles ~1.35× larger than UI art pixels. */
const MAP_ZOOM = 1.35

interface Props {
  readonly atlas: Atlas | null
  readonly world: World
  readonly player: Point
  readonly revealed: ReadonlySet<string>
  /** 0–1 land withering (darker, bloodier terrain as the weeks pass). */
  readonly decay: number
  /** Canvas size in art pixels. */
  readonly width: number
  readonly height: number
  readonly stageScale: number
  /** Zoom out to everything explored so far (hold Shift). */
  readonly overview?: boolean
  readonly onTileClick?: (tile: Point) => void
}

export function WorldCanvas({ atlas, world, player, revealed, decay, width, height, stageScale, overview = false, onTileClick }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const camera = useRef<Camera | null>(null)
  const explored = useMemo(() => (overview ? boundsOf(revealed) : null), [overview, revealed])

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !atlas) return
    const deviceScale = stageScale * (window.devicePixelRatio || 1)
    canvas.width = Math.round(width * deviceScale)
    canvas.height = Math.round(height * deviceScale)
    const normalPx = Math.max(1, Math.round(deviceScale * MAP_ZOOM))
    const view = explored ? fitBounds(canvas.width, canvas.height, explored, Math.max(1, normalPx - 1)) : { px: normalPx, focus: player }
    camera.current = drawWorld(ctx, atlas, { world, player, revealed, decay, heroBitmap: ICONS.knight, ...view })
  }, [atlas, world, player, revealed, decay, width, height, stageScale, explored])

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current
    const cam = camera.current
    if (!canvas || !cam || !onTileClick) return
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height
    onTileClick(screenToTile(cam, x, y))
  }

  return (
    <canvas
      ref={ref}
      className={`map-canvas${onTileClick ? ' is-clickable' : ''}`}
      style={{ width, height }}
      data-testid="map-canvas"
      onClick={onClick}
    />
  )
}
