import fs from 'node:fs';
import { defineConfig } from '@playwright/test';

const chromiumPath = process.env.PW_CHROMIUM_PATH
  || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  retries: 0,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8787',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : undefined,
  },
  webServer: {
    command: 'node server/index.js',
    port: 8787,
    reuseExistingServer: true,
    env: { TIRED_DATA_DIR: process.env.TIRED_DATA_DIR || 'data' },
  },
});
