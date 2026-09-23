import { expect, test, type Page } from '@playwright/test'
import { routeTo, SEED, TARGETS } from './routes'

/** Nearest Spider or Wolf (both lose to a starting hero). */
const ENEMY_ROUTE = routeTo(SEED, TARGETS.enemy)

const walkToSpider = async (page: Page) => {
  await page.goto(`/?seed=${SEED}`)
  await expect(page.getByText('50 steps left')).toBeVisible()
  for (const key of ENEMY_ROUTE) await page.keyboard.press(key)
}

test.describe('combat playback', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('walking into an enemy opens the combat screen and plays the fight', async ({ page }) => {
    await walkToSpider(page)
    await expect(page.getByTestId('combat')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Spider|Wolf/ })).toBeVisible()
    await page.waitForTimeout(700)
    await page.screenshot({ path: 'test-results/combat-playing.png' })
    await expect(page.getByRole('dialog', { name: 'Battle result' })).toBeVisible({ timeout: 20_000 })
  })

  test('skip jumps to the result and Continue returns to the map with the gold', async ({ page }) => {
    await walkToSpider(page)
    await page.getByRole('button', { name: 'Skip battle' }).click()
    const result = page.getByRole('dialog', { name: 'Battle result' })
    await expect(result).toContainText('Victory')
    await result.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByTestId('combat')).toHaveCount(0)
    await expect(page.getByLabel('Gold 1')).toBeVisible()
    const back: Record<string, string> = { w: 's', s: 'w', a: 'd', d: 'a' }
    await page.keyboard.press(back[ENEMY_ROUTE.at(-1) ?? 'w'] ?? 's')
    await page.waitForTimeout(200)
    await page.screenshot({ path: 'test-results/map-remains.png' })
  })

  test('speed buttons toggle and pause holds the fight', async ({ page }) => {
    await walkToSpider(page)
    const pause = page.getByRole('button', { name: 'Pause' })
    await pause.click()
    await expect(pause).toHaveAttribute('aria-pressed', 'true')
    await page.waitForTimeout(1500)
    await expect(page.getByRole('dialog', { name: 'Battle result' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Speed 3' }).click()
    await expect(page.getByRole('button', { name: 'Speed 3' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('dialog', { name: 'Battle result' })).toBeVisible({ timeout: 15_000 })
  })
})
