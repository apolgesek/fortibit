import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: '.',
  timeout: 45000,
  workers: 1,
  outputDir: './screenshots',
  updateSnapshots: 'none',
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      slowMo: 1000,
    },
    trace: 'off',
  },
  expect: {
    toMatchSnapshot: { threshold: 0.2 },
  },
};

module.exports = config;