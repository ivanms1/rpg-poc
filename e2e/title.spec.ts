import { expect, test } from '@playwright/test'

test.describe('title screen and saves', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('shows the title and starts a new run', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'He is Coming' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Continue/ })).toHaveCount(0)
    await page.screenshot({ path: 'test-results/title.png' })
    await page.getByRole('button', { name: 'New run' }).click()
    await expect(page.getByText('50 steps left')).toBeVisible()
    await expect(page.getByLabel('Wooden Stick')).toBeVisible()
  })

  test('a run in progress can be continued after a reload', async ({ page }) => {
    await page.goto('/?seed=991')
    await expect(page.getByText('50 steps left')).toBeVisible()
    for (const key of 'sws') await page.keyboard.press(key)
    await expect(page.getByText('47 steps left')).toBeVisible()
    await page.goto('/')
    const resume = page.getByRole('button', { name: /^Continue · week 1, day 1/ })
    await expect(resume).toBeVisible()
    await resume.click()
    await expect(page.getByText('47 steps left · seed 991')).toBeVisible()
  })

  test('a corrupt save is reported, not crashed on', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.setItem('hic.run', '{"version":1,"nonsense":true}'))
    await page.reload()
    await expect(page.getByRole('alert')).toContainText("couldn't be loaded")
    await page.getByRole('button', { name: 'New run' }).click()
    await expect(page.getByText('50 steps left')).toBeVisible()
  })
})
