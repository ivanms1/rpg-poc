import { useMemo } from 'react'
import { ICONS, type Bitmap, type IconName } from './icons'

interface Props {
  readonly icon: IconName
  readonly color: string
  /** Size of one bitmap pixel in art pixels. */
  readonly scale?: number
}

const toRects = (bitmap: Bitmap): { x: number; y: number }[] =>
  bitmap.flatMap((line, y) => [...line].flatMap((ch, x) => (ch === '#' ? [{ x, y }] : [])))

export function PixelIcon({ icon, color, scale = 1 }: Props) {
  const bitmap = ICONS[icon]
  const rects = useMemo(() => toRects(bitmap), [bitmap])
  const w = bitmap[0]?.length ?? 0
  const h = bitmap.length
  return (
    <svg
      className="pixel-icon"
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects.map(({ x, y }) => (
        <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={color} />
      ))}
    </svg>
  )
}
