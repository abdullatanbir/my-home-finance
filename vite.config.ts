import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
export default defineConfig({ base: '/my-home-finance/', plugins: [react(), { name: 'blueprint-pwa-precache', closeBundle() { const assets = readdirSync('dist/assets').filter(n => /\.(js|css)$/.test(n)).map(n => `/my-home-finance/assets/${n}`); const template = readFileSync('public/sw.js', 'utf8'); const build = createHash('sha256').update(assets.join('|') + template).digest('hex').slice(0, 12); writeFileSync('dist/sw.js', template.replace('__BUILD__', build).replace('__ASSETS__', JSON.stringify(assets))); } }] });
