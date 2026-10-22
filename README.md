# My Home Finance — Blueprint C

A private, browser-only personal finance app with Home, Spending, manual accounts, savings, investments, recurring transactions, statement review, reports and backup/restore. Financial data stays in localStorage; personal hero images, videos and music stay in device-local IndexedDB. No account, server credentials, database or bank connection is required.

## Development

Use Node 24, npm and Python 3:

```bash
npm ci
npm run dev
```

The app uses the `/my-home-finance/` base path. For the production app and service worker:

```bash
npm run build
npm run preview
```

## Validation

```bash
npm run qa
npm run test:core
npx playwright install chromium
npm run test:e2e -- --workers=2
npm run build
npm run test:pwa -- --workers=1
```

If Chromium is already installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable instead of downloading a Playwright browser. Both browser test configurations support this optional override; otherwise they use Playwright's managed Chromium.

`npm run build` performs the repository's TypeScript project build and may refresh the tracked generated `tsconfig.tsbuildinfo`. To type-check and bundle without refreshing that metadata, use `npm exec tsc -- --noEmit` followed by `npm exec vite -- build`.

## Home + Spending candidate

[Home + Spending acceptance](HOME_SPENDING_ACCEPTANCE.md) maps the requested sections to source, automated checks, and manual UAT. The supplied RC3 financial core is preserved. Home follows wealth → spending snapshot → budget → upcoming → recent activity. Spending includes monthly/weekly actual-spending charts, calendar, breakdown, budgets, transactions and filters. Chart drill-downs preserve the originating context, and tabs support arrow keys, Home and End.

To restore the delivered candidate into a new directory from its Git bundle:

```bash
git clone -b blueprint-c-home-spending My_Home_Finance_Home_Spending.bundle My_Home_Finance
cd My_Home_Finance
npm ci
npm run build
npm run preview
```

## Data safety and phone installation

Use a separate test browser profile and a copy of your backup for candidate acceptance. Export a financial JSON backup before clearing browser data or changing devices. Local media is excluded from financial backups and must be selected again on a new device. The PWA supports offline use after a successful cached production load. Physical-device installation, media-codec compatibility and Product Owner acceptance remain manual checks; see the acceptance document.
