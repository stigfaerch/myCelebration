import { test, expect } from '@playwright/test'

/**
 * Guest auth (R01) + admin auth (R02) smoke tests.
 *
 * Guest-flow specs require a provisioned Supabase test project with at least
 * one guest seeded and the same GUEST_PASSWORD configured. Gate via env:
 *   TEST_GUEST_UUID     — UUID of the seeded test guest
 *   TEST_GUEST_PASSWORD — value of GUEST_PASSWORD on the server
 *
 * The admin-login-rejects spec does NOT need a DB — middleware + server
 * action enforce the password and the rejection path is deterministic.
 */

const SAMPLE_UUID = process.env.TEST_GUEST_UUID
const GUEST_PASSWORD = process.env.TEST_GUEST_PASSWORD

test.describe('guest auth flow (R01)', () => {
  test.skip(
    !SAMPLE_UUID || !GUEST_PASSWORD,
    'Requires TEST_GUEST_UUID + TEST_GUEST_PASSWORD env (provisioned test Supabase)'
  )

  test('redirects to /enter when no cookie is set', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(`/${SAMPLE_UUID}`)
    await expect(page).toHaveURL(new RegExp(`/${SAMPLE_UUID}/enter$`))
  })

  test('lands on forside after entering correct password', async ({ page }) => {
    await page.goto(`/${SAMPLE_UUID}/enter`)
    await page
      .locator('input[type="password"]')
      .first()
      .fill(GUEST_PASSWORD!)
    await page.getByRole('button', { name: /fortsæt|enter|log ind/i }).click()
    await expect(page).toHaveURL(`/${SAMPLE_UUID}`)
  })

  test('invalid UUID does not land on a forside', async ({ page }) => {
    await page.goto('/00000000-0000-4000-8000-000000000000')
    // Middleware should redirect invalid-UUID guests away from forside.
    // Accept any non-forside outcome: /enter, /, or a 404.
    await expect(page).not.toHaveURL(/\/00000000-0000-4000-8000-000000000000$/)
  })
})

test.describe('admin auth flow (R02)', () => {
  test('admin login rejects wrong password', async ({ page }) => {
    await page.goto('/admin/login')
    // Admin login form uses placeholder-only labelling (no <label>). The server
    // action redirects back to /admin/login?error=1 on mismatch.
    const passwordInput = page
      .getByPlaceholder(/kodeord/i)
      .or(page.getByRole('textbox'))
      .or(page.locator('input[type="password"]'))
    await passwordInput.first().fill('definitely-wrong-password-smoke-test')
    await page.getByRole('button', { name: /log ind|enter/i }).click()
    // Wrong password → redirect back to /admin/login (possibly with ?error=1).
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
