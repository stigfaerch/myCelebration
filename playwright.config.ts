import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for myCelebration smoke tests.
 *
 * Running:
 *   npm run test:smoke             — headless, spins up `next dev` via webServer
 *   npm run test:smoke:ui          — interactive Playwright UI mode
 *
 * Env vars that gate DB-touching specs (tests skip cleanly if unset):
 *   TEST_GUEST_UUID       — a provisioned guest UUID against a test Supabase project
 *   TEST_GUEST_PASSWORD   — the shared GUEST_PASSWORD for that test project
 *   TEST_SCREEN_UUID      — a provisioned screen-type guest UUID
 *
 * Env vars that affect the harness itself:
 *   PW_BASE_URL           — override the base URL (default: http://localhost:3000)
 *   PW_EXTERNAL_SERVER    — when set, skip the built-in webServer (assume caller started it)
 *   CI                    — when set, webServer does NOT reuse an existing server (forces a clean boot)
 */
export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PW_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  webServer: process.env.PW_EXTERNAL_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
