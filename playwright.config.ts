import { defineConfig } from '@playwright/test';

export default defineConfig({

    testDir: './tests',

    use: {
        baseURL: 'http://localhost:5173/my-home-finance/',
    },

    webServer: {
        command: 'npx vite --host 127.0.0.1 --port 5173 --strictPort',
        url: 'http://127.0.0.1:5173/my-home-finance/',
        reuseExistingServer: false,
        timeout: 120_000,
    },

});