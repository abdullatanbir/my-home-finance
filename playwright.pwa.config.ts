import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './pwa-tests', use: { baseURL: 'http://127.0.0.1:4173/my-home-finance/' }, webServer: { command: './node_modules/.bin/vite preview --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173/my-home-finance/', reuseExistingServer: false } });
