import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: { baseURL: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000', extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : undefined, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER === 'true' ? undefined : {
    command: 'npm run dev', url: 'http://127.0.0.1:3000/login', reuseExistingServer: !process.env.CI, timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
