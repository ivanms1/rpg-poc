/**
 * Procedural 10×10 autotiles for paths and water, in the Bountiful Bits style:
 * flush toward matching neighbours, a wobbly open edge otherwise, rounded outer corners,
 * notched inner corners and (for paths) a dotted texture.
 */
export const N = 1
export const E = 2
export const S = 4
export const W = 8
export const NE = 16
export const SE = 32
export const SW = 64
export const NW = 128
export const ALL = 255

const SIZE = 10
const LAST = SIZE - 1

const NEIGHBOURS: readonly [bit: number, dx: number, dy: number][] = [
  [N, 0, -1], [E, 1, 0], [S, 0, 1], [W, -1, 0],
  [NE, 1, -1], [SE, 1, 1], [SW, -1, 1], [NW, -1, -1],
]

export const maskOf = (same: (dx: number, dy: number) => boolean): number =>
  NEIGHBOURS.reduce((mask, [bit, dx, dy]) => (same(dx, dy) ? mask | bit : mask), 0)

/** Interior texture holes for paths. */
const DOTS: readonly [number, number][] = [[3, 2], [7, 3], [2, 6], [6, 7]]

export interface AutotileStyle {
  readonly dots: boolean
}

const has = (mask: number, bit: number): boolean => (mask & bit) !== 0

export const autotileBitmap = (mask: number, style: AutotileStyle): readonly boolean[] => {
  const open = { n: !has(mask, N), e: !has(mask, E), s: !has(mask, S), w: !has(mask, W) }

  const filled = (x: number, y: number): boolean => {
    // Open edges: outermost line removed, the next one wobbles.
    if (open.n && (y === 0 || (y === 1 && x % 3 === 0))) return false
    if (open.s && (y === LAST || (y === LAST - 1 && x % 3 === 1))) return false
    if (open.w && (x === 0 || (x === 1 && y % 3 === 0))) return false
    if (open.e && (x === LAST || (x === LAST - 1 && y % 3 === 1))) return false
    // Outer corners: round off where two open edges meet.
    const cx = x < SIZE / 2 ? x : LAST - x
    const cy = y < SIZE / 2 ? y : LAST - y
    const vertOpen = y < SIZE / 2 ? open.n : open.s
    const horizOpen = x < SIZE / 2 ? open.w : open.e
    if (vertOpen && horizOpen && cx + cy <= 2) return false
    // Inner corners: both sides connect but the diagonal doesn't.
    const diagonal = y < SIZE / 2 ? (x < SIZE / 2 ? NW : NE) : x < SIZE / 2 ? SW : SE
    if (!vertOpen && !horizOpen && !has(mask, diagonal) && cx + cy <= 1) return false
    return !(style.dots && DOTS.some(([dx, dy]) => dx === x && dy === y))
  }

  return Array.from({ length: SIZE * SIZE }, (_, i) => filled(i % SIZE, Math.floor(i / SIZE)))
}
