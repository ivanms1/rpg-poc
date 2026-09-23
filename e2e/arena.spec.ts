import { expect, test } from '@playwright/test'

test.describe('combat arena', () => {
  test('simulates the default loadout against a wolf', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 1000 })
    await page.goto('/?arena')
    await expect(page.getByTestId('arena-result')).toContainText('Victory')
    await expect(page.getByTestId('arena-hero-stats')).toHaveText('Max HP 10 · Attack 3 · Armor 4 · Speed 1')
    await expect(page.getByLabel('Battle log')).toContainText('Horned Helmet (Battle Start)')
  })

  test('re-simulates when the loadout or opponent changes', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 1000 })
    await page.goto('/?arena')
    await page.getByLabel('Weapon').selectOption('wooden-stick')
    await page.getByLabel('Slot 1', { exact: true }).selectOption('')
    await page.getByLabel('Slot 2', { exact: true }).selectOption('')
    await page.getByLabel('Creature').selectOption('boss:black-knight')
    await expect(page.getByTestId('arena-result')).toContainText('Defeat')
    await expect(page.getByLabel('Battle log')).toContainText('Black Knight gains 3 attack')
    await page.screenshot({ path: 'test-results/arena.png', fullPage: false })
  })
})
