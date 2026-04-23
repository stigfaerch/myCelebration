import { test, expect } from '@playwright/test'

/**
 * Baseline harness smoke test: confirms the Next.js dev server boots and
 * the root not-found boundary renders without crashing.
 *
 * This test must NEVER be gated — it is the sanity check that the whole
 * Playwright harness is wired correctly. If this fails, none of the other
 * specs can be trusted.
 *
 * Note: single-segment paths like /nonexistent match Next.js's [uuid]
 * dynamic segment, which loads guest-scoped data and can surface as a 500
 * when the test DB isn't provisioned. A multi-segment path with no match
 * reliably hits the root not-found.tsx boundary.
 */
test('app boots and serves the root not-found UI', async ({ page }) => {
  const response = await page.goto('/__smoke__/does/not/exist')
  // Next.js returns 404 for unmatched routes and renders not-found.tsx.
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading').first()).toBeVisible()
})
