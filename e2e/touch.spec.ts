import { expect, test } from '@playwright/test'
import { nearbyTile, routeTo, SEED, TARGETS } from './routes'

const CHEST_PATH = routeTo(SEED, TARGETS.chest)

test.describe('phone (landscape, touch)', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/?seed=${SEED}`)
    await expect(page.getByText('50 steps left')).toBeVisible()
  })

  test('the stage fills the screen height', async ({ page }) => {
    const box = await page.getByTestId('stage').boundingBox()
    expect(box?.height).toBeCloseTo(390, 0)
    expect(box?.width).toBeCloseTo((480 * 390) / 270, 0)
    await expect(page.getByText('Turn your device sideways')).toHaveCount(0)
    await page.screenshot({ path: 'test-results/phone-landscape.png' })
  })

  test('tapping a nearby tile walks there', async ({ page }) => {
    const { dx, dy, steps } = nearbyTile(SEED)
    const canvas = page.getByTestId('map-canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('map canvas not laid out')
    // 10 art pixels per tile × round(stage scale × 1.35) device pixels per art pixel, back in CSS pixels.
    const tile = await canvas.evaluate((c: HTMLCanvasElement) => (10 * Math.round((c.width / 382) * 1.35) * c.getBoundingClientRect().width) / c.width)
    await page.touchscreen.tap(box.x + box.width / 2 + dx * tile, box.y + box.height / 2 + dy * tile)
    await expect(page.getByText(`${50 - steps} steps left`)).toBeVisible()
  })

  test('tap an item to pin its tooltip, tap a slot to move it, and discard with the button', async ({ page }) => {
    for (const key of CHEST_PATH) await page.keyboard.press(key)
    await page.getByRole('dialog', { name: 'Treasure Chest' }).getByRole('button', { name: /^Take / }).first().tap()
    const slots = page.locator('.slot-grid .slot')
    const label = (await slots.nth(0).getAttribute('aria-label'))!
    await slots.nth(0).tap()
    await expect(page.getByRole('tooltip')).toContainText('Tap another slot')
    await slots.nth(3).tap()
    await expect(slots.nth(3)).toHaveAttribute('aria-label', label)
    await expect(slots.nth(0)).toHaveAttribute('aria-label', 'Empty slot')
    await slots.nth(3).tap()
    await page.getByRole('button', { name: 'Discard' }).tap()
    await expect(page.getByLabel('Empty slot')).toHaveCount(4)
  })
})

test.describe('phone (portrait)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('asks to turn the device sideways', async ({ page }) => {
    await page.goto(`/?seed=${SEED}`)
    await expect(page.getByText('Turn your device sideways')).toBeVisible()
  })
})
