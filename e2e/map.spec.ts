import { expect, test } from '@playwright/test'
import { nearbyTile, SEED } from './routes'

/** At 1920×1080 the stage is ×4 and a map tile is 10 × round(4 × 1.35) = 50 CSS pixels. */
const TILE_PX = 50

test.describe('map controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`/?seed=${SEED}`)
    await expect(page.getByText('50 steps left')).toBeVisible()
  })

  test('clicking a nearby tile walks the hero there', async ({ page }) => {
    const { dx, dy, steps } = nearbyTile(SEED)
    const box = await page.getByTestId('map-canvas').boundingBox()
    if (!box) throw new Error('map canvas not laid out')
    await page.mouse.click(box.x + box.width / 2 + dx * TILE_PX, box.y + box.height / 2 + dy * TILE_PX)
    await expect(page.getByText(`${50 - steps} steps left`)).toBeVisible()
  })

  test('holding Shift shows the whole map until released', async ({ page }) => {
    await page.keyboard.down('Shift')
    await expect(page.getByText('release Shift to return')).toBeVisible()
    await page.waitForTimeout(200)
    await page.screenshot({ path: 'test-results/map-overview.png' })
    await page.keyboard.press('d')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByText('50 steps left')).toBeVisible()
    await page.keyboard.up('Shift')
    await expect(page.getByText('release Shift to return')).toHaveCount(0)
  })

  test('the Shf button pins the map until Esc; a Shift tap does not close it', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle map overview' }).click()
    await expect(page.getByText('Shf or Esc to return')).toBeVisible()
    await page.keyboard.press('Shift')
    await expect(page.getByText('Shf or Esc to return')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText(/to return/)).toHaveCount(0)
  })
})
