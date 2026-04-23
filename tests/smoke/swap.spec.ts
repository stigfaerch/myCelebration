import { test, expect } from '@playwright/test'

/**
 * Task swap request flow (R17) smoke test.
 *
 * Exercises the /opgaver page render for a guest. True realtime verification
 * (guest A creates swap → guest B sees incoming in <1s) requires two guest
 * sessions simultaneously and is captured as a manual-test row in
 * QA-MATRIX.md. Likewise the atomic-accept race (two tabs accepting the
 * same swap) is a manual row.
 *
 * Gated by TEST_GUEST_UUID + TEST_GUEST_PASSWORD.
 */

const SAMPLE_UUID = process.env.TEST_GUEST_UUID
const GUEST_PASSWORD = process.env.TEST_GUEST_PASSWORD

test.describe('swap request surface (R17)', () => {
  test.skip(
    !SAMPLE_UUID || !GUEST_PASSWORD,
    'Requires TEST_GUEST_UUID + TEST_GUEST_PASSWORD env (provisioned test Supabase)'
  )

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(`/${SAMPLE_UUID}/enter`)
    await page
      .locator('input[type="password"]')
      .first()
      .fill(GUEST_PASSWORD!)
    await page.getByRole('button', { name: /fortsæt|enter|log ind/i }).click()
    await expect(page).toHaveURL(`/${SAMPLE_UUID}`)
  })

  test('opgaver page renders with a mine-opgaver section', async ({ page }) => {
    await page.goto(`/${SAMPLE_UUID}/opgaver`)
    // Heading may be "Mine opgaver" or just "Opgaver" — accept either.
    const heading = page
      .getByRole('heading', { name: /mine opgaver/i })
      .or(page.getByRole('heading', { name: /opgaver/i }))
    await expect(heading.first()).toBeVisible()
  })
})
