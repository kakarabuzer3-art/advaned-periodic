import { defineConfig, devices } from '@playwright/test'

// In locked-down environments, point at an existing Chromium: PW_CHROMIUM_PATH=/path/to/chrome
const executablePath = process.env.PW_CHROMIUM_PATH

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    // Never reuse a server: a stale build would silently be tested instead of the current code.
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
