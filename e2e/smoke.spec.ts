import { expect, test } from '@playwright/test'
import { paceKeys, SEED as SEED_NUMBER } from './routes'

const SEED = `/?seed=${SEED_NUMBER}`
const [out, back] = paceKeys(SEED_NUMBER)

test.describe('stage and map', () => {
  test('scales the 480×270 stage by an integer factor', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(SEED)
    expect(await page.getByTestId('stage').boundingBox()).toMatchObject({ width: 1920, height: 1080 })
    await page.setViewportSize({ width: 1300, height: 800 })
    await expect.poll(() => page.getByTestId('stage').boundingBox()).toMatchObject({ width: 960, height: 540 })
  })

  test('a new run: 20 health, a Wooden Stick, 4 open slots and a drawn map', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(SEED)
    await expect(page.getByLabel('Health 20/20')).toBeVisible()
    await expect(page.getByLabel('Wooden Stick')).toBeVisible()
    await expect(page.getByLabel('Empty slot')).toHaveCount(4)
    await expect(page.getByLabel('Locked slot')).toHaveCount(4)
    await expect(page.getByText(`seed ${SEED_NUMBER}`)).toBeVisible()
    const drawn = await page.getByTestId('map-canvas').evaluate(async (canvas: HTMLCanvasElement) => {
      await new Promise((r) => setTimeout(r, 300))
      const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
      let opaque = 0
      for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) opaque++
      return opaque
    })
    expect(drawn).toBeGreaterThan(5000)
    await page.screenshot({ path: 'test-results/map-1080p.png' })
  })

  test('hovering the weapon shows its tooltip', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(SEED)
    await page.getByLabel('Wooden Stick').hover()
    await expect(page.getByRole('tooltip')).toContainText('Wooden Stick')
  })

  test('walking ticks the clock and night falls after 50 steps', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(SEED)
    await expect(page.getByText('50 steps left')).toBeVisible()
    for (let i = 0; i < 3; i++) await page.keyboard.press(i % 2 === 0 ? out : back)
    await expect(page.getByText('47 steps left')).toBeVisible()
    for (let i = 3; i < 52; i++) await page.keyboard.press(i % 2 === 0 ? out : back)
    await expect(page.getByText('night 1 · 28 steps left')).toBeVisible()
    await page.screenshot({ path: 'test-results/night-1080p.png' })
  })
})
