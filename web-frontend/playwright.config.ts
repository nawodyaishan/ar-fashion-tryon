import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3100',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec next dev --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_GARMENT_API_BASE: 'http://127.0.0.1:5100',
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: '',
      NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: '',
      NEXT_PUBLIC_VTON_API_BASE: 'http://127.0.0.1:5100',
      NEXT_PUBLIC_BACKEND_URL: 'http://127.0.0.1:5100',
      NEXT_PUBLIC_HF_TOKEN: '',
    },
  },
});
