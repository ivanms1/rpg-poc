import { expect, test } from '@playwright/test'
import { REVEAL_SEED, REVEAL_TARGETS, routeTo } from './routes'

test.describe('reveals', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`/?seed=${REVEAL_SEED}`)
    await expect(page.getByText('50 steps left')).toBeVisible()
  })

  test('the lookout tower plays a reveal before its dialog; a key skips it', async ({ page }) => {
    for (const key of routeTo(REVEAL_SEED, REVEAL_TARGETS.lookout)) await page.keyboard.press(key)
    const canvas = page.getByTestId('map-canvas')
    await expect(canvas).toHaveAttribute('data-revealing', 'true')
    await expect(page.getByText('The fog lifts')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Lookout Tower' })).toHaveCount(0)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/reveal-lookout.png' })
    await page.waitForTimeout(700)
    await page.screenshot({ path: 'test-results/reveal-lookout-late.png' })
    await page.keyboard.press('Space')
    await expect(canvas).not.toHaveAttribute('data-revealing', 'true')
    await expect(page.getByRole('dialog', { name: 'Lookout Tower' })).toBeVisible()
  })

  test('a crystal ball vision pans to the location and comes back on its own', async ({ page }) => {
    for (const key of routeTo(REVEAL_SEED, REVEAL_TARGETS.crystalBall)) await page.keyboard.press(key)
    const pick = page.getByRole('dialog', { name: 'Crystal Ball' })
    await expect(pick).toBeVisible()
    await pick.locator('.pick-button').first().click()
    const canvas = page.getByTestId('map-canvas')
    await expect(canvas).toHaveAttribute('data-revealing', 'true')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/reveal-crystal.png' })
    await expect(canvas).not.toHaveAttribute('data-revealing', 'true', { timeout: 5000 })
    await expect(page.getByText('The fog lifts')).toHaveCount(0)
  })
})
