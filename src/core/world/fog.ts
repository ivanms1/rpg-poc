/** Fog of war: tiles within sight are revealed and stay revealed. */
export const tileKey = (x: number, y: number): string => `${x},${y}`

/** Rounded disc (r² + r) so the revealed area looks like a blob, not a diamond or square. */
export const inSight = (dx: number, dy: number, radius: number): boolean => dx * dx + dy * dy <= radius * radius + radius

/** Returns a new set with tiles around (x, y) revealed, or the same set if nothing changed. */
export const revealAround = (revealed: ReadonlySet<string>, x: number, y: number, radius: number): ReadonlySet<string> => {
  const added: string[] = []
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const key = tileKey(x + dx, y + dy)
      if (inSight(dx, dy, radius) && !revealed.has(key)) added.push(key)
    }
  }
  return added.length === 0 ? revealed : new Set([...revealed, ...added])
}
