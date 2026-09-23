import { boundsOf, cameraFor, fitBounds, screenToTile, tileToScreen } from './camera'

describe('camera', () => {
  const cam = cameraFor(200, 100, 2, { x: 10, y: 5 })

  it('centres the focus tile on the canvas', () => {
    expect(cam.size).toBe(20)
    const { x, y } = tileToScreen(cam, { x: 10, y: 5 })
    expect(x + cam.size / 2).toBe(100)
    expect(y + cam.size / 2).toBe(50)
  })

  it('maps screen pixels back to tiles', () => {
    expect(screenToTile(cam, 100, 50)).toEqual({ x: 10, y: 5 })
    expect(screenToTile(cam, 100 + 20, 50 - 20)).toEqual({ x: 11, y: 4 })
    expect(screenToTile(cam, 0, 0)).toEqual({ x: 5, y: 3 })
  })

  it('round-trips any tile', () => {
    for (const t of [{ x: 0, y: 0 }, { x: 3, y: 9 }, { x: 12, y: 1 }]) {
      const p = tileToScreen(cam, t)
      expect(screenToTile(cam, p.x + 1, p.y + 1)).toEqual(t)
    }
  })

  it('lists the visible tile range', () => {
    expect(cam.x0).toBeLessThanOrEqual(5)
    expect(cam.x0 + cam.cols).toBeGreaterThanOrEqual(15)
  })
})

describe('overview fitting', () => {
  it('bounds tile keys', () => {
    expect(boundsOf(['3,4', '10,2', '5,9'])).toEqual({ minX: 3, minY: 2, maxX: 10, maxY: 9 })
    expect(boundsOf([])).toBeNull()
  })

  it('picks the largest whole zoom that fits, capped', () => {
    const bounds = { minX: 0, minY: 0, maxX: 17, maxY: 7 }
    // 20×10 tiles with margin into 400×300 → 2 px per art pixel
    expect(fitBounds(400, 300, bounds, 5)).toEqual({ px: 2, focus: { x: 8.5, y: 3.5 } })
    expect(fitBounds(4000, 3000, bounds, 5).px).toBe(5)
    expect(fitBounds(40, 30, bounds, 5).px).toBe(1)
  })
})
