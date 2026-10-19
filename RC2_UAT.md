# Blueprint C RC2 local UAT

RC2 refines the Blueprint C presentation and interaction model. The canonical financial schema, calculations, migration adapters, recurring engine, statement-import rules and backup format remain unchanged from RC1.

This branch is a release candidate. It has not been pushed, merged, deployed or accepted for production. The supplied completion report records the exact RC2 commit and bundle checksum. The older `BLUEPRINT_C_RELEASE_CANDIDATE.md` is the historical RC1 report.

## Start the production preview

```bash
git clone -b blueprint-c-financial-core-2.0 My_Home_Finance_Blueprint_C_RC2.bundle My_Home_Finance_RC2
cd My_Home_Finance_RC2
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/my-home-finance/` in an isolated test profile. Restore a copy of your financial backup there; keep your accepted production browser session separate.

## Product Owner focus

1. Review the neutral charcoal foundation, typography, financial colors, focus/selection states and bottom navigation across the workspaces in both themes. Compare mobile, tablet and desktop comfort.
2. On Home, use Net Worth / Assets / Liabilities and 1W / 1M / 3M / 6M / 1Y / ALL. Net Worth uses saved snapshots plus the real current value. Assets and liabilities use actual saved ledger dates. Empty or sparse history must stay sparse; no sample history is shipped in the app.
3. Compare the last seven calendar days against the preceding seven. Select a day, inspect the daily summary and open its transaction. Check the selected budget month and its previous-month comparison.
4. Open the drawer, scroll to System, close it, and reopen. It should start at Overview, dim/inert the underlying page, and close through its close button, outside tap or Escape. Verify an actual destination selection.
5. In Settings → Music & Artwork, select an image, then a looping video, and select ambient music independently. Choose Ambient music or Hero video as the sound source. Use the single Home sound toggle. Only the chosen source should be audible; music should continue through normal SPA navigation, and video sound should stop away from Home. Wait for media saving to finish before reloading.
6. Reload and confirm the selected media persists on this device. Test offline relaunch after the production shell is cached. Browser autoplay and codec restrictions may require a sound-control tap or a different media file; sound is never promised without browser permission.
7. Check the month/year picker in Spending, Transactions and Finance Calendar. A fresh store starts at 2026. Real historical records—including 2025 records—remain accessible. The picker also offers a short future planning horizon and any saved future years.
8. Spot-check representative migrated totals, a recurring occurrence, CSV review, a card-payment transfer and backup export/restore. RC2 must preserve RC1 financial results.

## Engineering validation commands

```bash
npm run qa
npm run test:core
npm run test:e2e
npm run build
npm run test:pwa
```

Playwright uses the locked 1.64.0 installation. In the supplied Work environment, set `PLAYWRIGHT_BROWSERS_PATH=/workspace/scratch/4c01dd73b0c4/playwright-cache-blueprint-c`. The three tiny files in `tests/fixtures` are independently generated solid-color media and test tones; they are browser-test inputs, not shipped Home media or demo financial history.

Large media remains in IndexedDB and is excluded from the structured financial backup. Actual device installation, Safari/iOS codec behavior and Product Owner acceptance remain final UAT checks.
