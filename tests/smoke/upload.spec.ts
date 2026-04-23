import { test, expect } from '@playwright/test'

/**
 * Photo upload flow (R20) smoke test.
 *
 * Exercises the guest /billeder page render + presence of the camera entry
 * point. A full end-to-end upload requires camera getUserMedia + a live
 * Supabase storage bucket and is out of scope for v1 smoke tests — it is
 * covered as a manual row in QA-MATRIX.md.
 *
 * Gated by TEST_GUEST_UUID + TEST_GUEST_PASSWORD (must be able to pass the
 * /enter gate via pre-seeded cookie or interactive login helper).
 */

const SAMPLE_UUID = process.env.TEST_GUEST_UUID
const GUEST_PASSWORD = process.env.TEST_GUEST_PASSWORD

test.describe('photo upload surface (R20)', () => {
  test.skip(
    !SAMPLE_UUID || !GUEST_PASSWORD,
    'Requires TEST_GUEST_UUID + TEST_GUEST_PASSWORD env (provisioned test Supabase)'
  )

  test.beforeEach(async ({ page }) => {
    // Clear cookies and authenticate via the /enter form so we reach /billeder.
    await page.context().clearCookies()
    await page.goto(`/${SAMPLE_UUID}/enter`)
    await page
      .locator('input[type="password"]')
      .first()
      .fill(GUEST_PASSWORD!)
    await page.getByRole('button', { name: /fortsæt|enter|log ind/i }).click()
    await expect(page).toHaveURL(`/${SAMPLE_UUID}`)
  })

  test('own photos page renders a billeder heading', async ({ page }) => {
    await page.goto(`/${SAMPLE_UUID}/billeder`)
    await expect(page.getByRole('heading', { name: /billeder/i }).first()).toBeVisible()
  })

  test('camera entry link is present on the billeder page', async ({ page }) => {
    await page.goto(`/${SAMPLE_UUID}/billeder`)
    // The camera page lives at /[uuid]/billeder/kamera — any link/button
    // advertising camera/tag-billede entry counts.
    const cameraEntry = page
      .getByRole('link', { name: /tag billede|kamera/i })
      .or(page.getByRole('button', { name: /tag billede|kamera/i }))
    await expect(cameraEntry.first()).toBeVisible()
  })
})
