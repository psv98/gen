import { defineConfig } from '@playwright/test';

// Uses a locally installed Chrome when CHROME_PATH is set (e.g. /usr/bin/google-chrome),
// otherwise Playwright's bundled Chromium (`npx playwright install chromium`).
const executablePath = process.env.CHROME_PATH;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
  },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true },
});
