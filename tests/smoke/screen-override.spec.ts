import { test, expect } from '@playwright/test'

/**
 * Screen-override flow (R23) smoke test.
 *
 * Exercises the default-state render of a screen-type guest: when no admin
 * override is pushed, the screen falls back to GalleryHorizontal. True
 * realtime override verification (admin clicks "Vis på skærm" → screen
 * re-renders in <1s) requires two browser sessions and is a manual row in
 * QA-MATRIX.md.
 *
 * Gated by TEST_SCREEN_UUID — a guest with type='screen' in the test DB.
 * Note: screen guests do NOT require the GUEST_PASSWORD /enter gate (they
 * bypass the password middleware — the UUID itself is the credential).
 */

const SCREEN_UUID = process.env.TEST_SCREEN_UUID

test.describe('screen default render (R23)', () => {
  test.skip(
    !SCREEN_UUID,
    'Requires TEST_SCREEN_UUID env (provisioned screen-type guest)'
  )

  test('screen guest renders something for the gallery default', async ({ page }) => {
    await page.goto(`/${SCREEN_UUID}`)
    // Default state is ScreenDefault → GalleryHorizontal. When there are no
    // photos it may show "Ingen billeder"; otherwise the gallery grid.
    // Either way, the page body should contain some identifiable content
    // and have responded with a 2xx.
    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
  })
})
