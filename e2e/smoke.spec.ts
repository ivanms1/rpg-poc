import { expect, test } from '@playwright/test'

test.describe('layout mock', () => {
  test('scales the 480×270 stage by an integer factor', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    const box = await page.getByTestId('stage').boundingBox()
    expect(box).toMatchObject({ width: 1920, height: 1080 })

    await page.setViewportSize({ width: 1300, height: 800 })
    await expect.poll(() => page.getByTestId('stage').boundingBox()).toMatchObject({ width: 960, height: 540 })
  })

  test('renders stats, inventory and a drawn map', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    await expect(page.getByLabel('Health 16/16')).toBeVisible()
    await expect(page.getByLabel('Horned Helmet')).toBeVisible()
    await expect(page.getByLabel('Locked slot')).toHaveCount(4)

    const drawn = await page.getByTestId('map-canvas').evaluate(async (canvas: HTMLCanvasElement) => {
      await new Promise((r) => setTimeout(r, 300))
      const ctx = canvas.getContext('2d')
      if (!ctx) return 0
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let opaque = 0
      for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) opaque++
      return opaque
    })
    expect(drawn).toBeGreaterThan(1000)
    await page.screenshot({ path: 'test-results/layout-1080p.png' })
  })

  test('moving advances the clock and shows item tooltips', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    await expect(page.getByText('50 steps left')).toBeVisible()
    for (let i = 0; i < 3; i++) await page.keyboard.press('d')
    await expect(page.getByText('47 steps left')).toBeVisible()

    await page.getByLabel('Horned Helmet').hover()
    await expect(page.getByRole('tooltip')).toContainText('Battle Start: Gain 1 thorns')
    await page.screenshot({ path: 'test-results/tooltip-1080p.png' })
  })

  test('night falls after 50 steps', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    await expect(page.getByText('50 steps left')).toBeVisible()
    for (let i = 0; i < 25; i++) await page.keyboard.press('d')
    for (let i = 0; i < 27; i++) await page.keyboard.press('s')
    await expect(page.getByText('night 1 · 28 steps left')).toBeVisible()
    await page.screenshot({ path: 'test-results/night-1080p.png' })
  })
})
