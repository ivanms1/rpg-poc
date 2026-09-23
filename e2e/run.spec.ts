import { expect, test } from '@playwright/test'
import { routeTo, SEED, TARGETS } from './routes'

const CHEST_PATH = routeTo(SEED, TARGETS.chest)
const MERCHANT_PATH = routeTo(SEED, TARGETS.merchant)
const FORGE_PATH = routeTo(SEED, TARGETS.forge)
const OIL_PATH = routeTo(SEED, TARGETS.bladeOil)
const BACK: Record<string, string> = { w: 's', s: 'w', a: 'd', d: 'a' }
const lastStep = CHEST_PATH.at(-1) ?? 's'

test.describe('run loop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`/?seed=${SEED}`)
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
    await page.keyboard.press(BACK[lastStep]!)
    await page.keyboard.press(lastStep)
    await page.keyboard.press('1')
    await expect(page.getByLabel('Empty slot')).toHaveCount(3)
    await page.locator('.slot-grid .slot').first().dblclick()
    await expect(page.getByLabel('Empty slot')).toHaveCount(4)
  })

  test('dragging an item to another slot reorders it', async ({ page }) => {
    for (const key of CHEST_PATH) await page.keyboard.press(key)
    await page.keyboard.press('1')
    const slots = page.locator('.slot-grid .slot')
    const label = await slots.nth(0).getAttribute('aria-label')
    await slots.nth(0).dragTo(slots.nth(2))
    await expect(slots.nth(0)).toHaveAttribute('aria-label', 'Empty slot')
    await expect(slots.nth(2)).toHaveAttribute('aria-label', label!)
  })

  test('a click pins an item without moving it, even before a double-click elsewhere', async ({ page }) => {
    for (const key of CHEST_PATH) await page.keyboard.press(key)
    await page.keyboard.press('1')
    const slots = page.locator('.slot-grid .slot')
    const label = (await slots.nth(0).getAttribute('aria-label'))!
    await slots.nth(0).click()
    await page.mouse.move(0, 0)
    await expect(page.getByRole('tooltip')).toContainText(label)
    await expect(page.getByRole('button', { name: 'Discard' })).toBeVisible()
    await slots.nth(2).dblclick()
    await expect(slots.nth(0)).toHaveAttribute('aria-label', label)
    await expect(page.getByLabel('Empty slot')).toHaveCount(3)
  })

  test('the merchant shows 6 wares and refuses without gold', async ({ page }) => {
    for (const key of MERCHANT_PATH) await page.keyboard.press(key)
    const shop = page.getByRole('dialog', { name: 'Traveling Merchant' })
    await expect(shop).toBeVisible()
    await expect(shop.getByRole('button', { name: /^Buy / })).toHaveCount(6)
    await page.screenshot({ path: 'test-results/merchant.png' })
    await page.keyboard.press('1')
    await expect(shop.getByRole('alert')).toContainText('Not enough gold')
    await page.keyboard.press('Escape')
    await expect(shop).toHaveCount(0)
  })

  test('the forge puts an edge on the weapon', async ({ page }) => {
    for (const key of FORGE_PATH) await page.keyboard.press(key)
    const forge = page.getByRole('dialog', { name: 'Forge' })
    await expect(forge).toContainText('free')
    const edge = (await forge.getByRole('button', { name: /^Forge / }).first().getAttribute('aria-label'))!.replace('Forge ', '')
    await page.keyboard.press('1')
    await expect(forge).toHaveCount(0)
    await page.getByLabel('Wooden Stick').hover()
    await expect(page.getByRole('tooltip')).toContainText(`Edge — ${edge}`)
  })

  test('blade oil coats the weapon', async ({ page }) => {
    for (const key of OIL_PATH) await page.keyboard.press(key)
    await expect(page.getByRole('dialog', { name: 'Blade Oil' })).toBeVisible()
    await page.keyboard.press('1')
    await expect(page.getByLabel('Attack 2')).toBeVisible()
    await page.getByLabel('Wooden Stick').hover()
    await expect(page.getByRole('tooltip')).toContainText('Oils: +1 attack')
  })

  test('Tab previews the boss, who can be fought early', async ({ page }) => {
    await page.keyboard.press('Tab')
    const preview = page.getByRole('dialog', { name: 'Boss preview' })
    await expect(preview).toContainText('Arrives at the end of week 1')
    await page.screenshot({ path: 'test-results/boss-preview.png' })
    await preview.getByRole('button', { name: 'Fight now' }).click()
    const intro = page.getByRole('dialog', { name: 'Boss arrives' })
    await expect(intro).toContainText('The week 1 boss arrives')
    await page.waitForTimeout(1600)
    await page.screenshot({ path: 'test-results/boss-intro.png' })
    await page.keyboard.press('Space')
    await expect(intro).toHaveCount(0)
    await expect(page.getByTestId('combat')).toBeVisible()
    await page.getByRole('button', { name: 'Skip battle' }).click()
    await expect(page.getByRole('dialog', { name: 'Battle result' })).toBeVisible()
  })
})
