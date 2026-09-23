import { expect, test, type Page } from '@playwright/test'

/** Demo map seed 1337: a level-1 Spider stands 7 left, 2 up from the start. */
const walkToSpider = async (page: Page) => {
  await page.goto('/')
  await expect(page.getByText('50 steps left')).toBeVisible()
  for (let i = 0; i < 7; i++) await page.keyboard.press('a')
  for (let i = 0; i < 2; i++) await page.keyboard.press('w')
}

test.describe('combat playback', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('walking into an enemy opens the combat screen and plays the fight', async ({ page }) => {
    await walkToSpider(page)
    await expect(page.getByTestId('combat')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Spider' })).toBeVisible()
    await expect(page.getByText('If Spider has more speed than the player')).toBeVisible()
    await page.waitForTimeout(700)
    await page.screenshot({ path: 'test-results/combat-playing.png' })
    await expect(page.getByRole('dialog', { name: 'Battle result' })).toContainText('Victory', { timeout: 15_000 })
  })

  test('skip jumps to the result and Continue returns to the map', async ({ page }) => {
    await walkToSpider(page)
    await page.getByRole('button', { name: 'Skip battle' }).click()
    const result = page.getByRole('dialog', { name: 'Battle result' })
    await expect(result).toContainText('Victory')
    await expect(result).toContainText('+1')
    await page.screenshot({ path: 'test-results/combat-result.png' })
    await result.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByTestId('combat')).toHaveCount(0)
    await expect(page.getByLabel('Gold 1')).toBeVisible()
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
    await expect(page.getByRole('dialog', { name: 'Battle result' })).toBeVisible({ timeout: 10_000 })
  })
})
