import { useMemo } from 'react'
import { ICONS, type Bitmap, type IconName } from './icons'

type Props = {
  readonly color: string
  /** Size of one bitmap pixel in art pixels. */
  readonly scale?: number
} & ({ readonly icon: IconName; readonly bitmap?: never } | { readonly bitmap: Bitmap; readonly icon?: never })

const toRects = (bitmap: Bitmap): { x: number; y: number }[] =>
  bitmap.flatMap((line, y) => [...line].flatMap((ch, x) => (ch === '#' ? [{ x, y }] : [])))

/** Crisp SVG rendering of a '#'-bitmap: a named UI icon or any raw bitmap. */
export function PixelIcon({ icon, bitmap, color, scale = 1 }: Props) {
  const source: Bitmap = bitmap ?? ICONS[icon as IconName]
  const rects = useMemo(() => toRects(source), [source])
  const w = source[0]?.length ?? 0
  const h = source.length
  return (
    <svg className="pixel-icon" width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects.map(({ x, y }) => (
        <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={color} />
      ))}
    </svg>
  )
}
