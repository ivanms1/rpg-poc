import { expect, test } from '@playwright/test'

/** Seed 12345: a Treasure Chest is 15 steps from the start (BFS over the generated map). */
const CHEST_PATH = 'ssssssssssaaaaa'

test.describe('run loop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/?seed=12345')
    await expect(page.getByText('50 steps left')).toBeVisible()
  })

  test('a chest offers three items and the pick lands in the first slot', async ({ page }) => {
    for (const key of CHEST_PATH) await page.keyboard.press(key)
    const chest = page.getByRole('dialog', { name: 'Treasure Chest' })
    await expect(chest).toBeVisible()
    const cards = chest.getByRole('button', { name: /^Take / })
    await expect(cards).toHaveCount(3)
    await page.screenshot({ path: 'test-results/chest.png' })
    const label = (await cards.nth(1).getAttribute('aria-label'))!.replace('Take ', '')
    await cards.nth(1).click()
    await expect(chest).toHaveCount(0)
    await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    await expect(page.getByLabel('Empty slot')).toHaveCount(3)
  })

  test('closing a chest with Esc leaves it for later; double-click discards', async ({ page }) => {
    for (const key of CHEST_PATH) await page.keyboard.press(key)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Treasure Chest' })).toHaveCount(0)
    await page.keyboard.press('d')
    await page.keyboard.press('a')
    await page.keyboard.press('1')
    await expect(page.getByLabel('Empty slot')).toHaveCount(3)
    await page.locator('.slot-grid .slot').first().dblclick()
    await expect(page.getByLabel('Empty slot')).toHaveCount(4)
  })

  test('Tab previews the boss, who can be fought early', async ({ page }) => {
    await page.keyboard.press('Tab')
    const preview = page.getByRole('dialog', { name: 'Boss preview' })
    await expect(preview).toContainText('Arrives at the end of week 1')
    await page.screenshot({ path: 'test-results/boss-preview.png' })
    await preview.getByRole('button', { name: 'Fight now' }).click()
    await expect(page.getByTestId('combat')).toBeVisible()
    await page.getByRole('button', { name: 'Skip battle' }).click()
    await expect(page.getByRole('dialog', { name: 'Battle result' })).toBeVisible()
  })
})
