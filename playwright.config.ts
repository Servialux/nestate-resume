import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'on',
    screenshot: 'on',
    video: 'on'
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /(?:accessibility|seo|blog-markdown)\.spec\.ts/ },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] }, testMatch: /(?:accessibility|seo|blog-markdown)\.spec\.ts/ }
  ],
  webServer: {
    command: 'node --experimental-strip-types scripts/e2e-server.mjs',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false
  }
});
