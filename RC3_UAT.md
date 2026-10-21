# Blueprint C RC3 local UAT

Starting release: RC2 `04ad1a8200a837324d2a164ad9b727d3e06c613d`.
Work remains on `blueprint-c-financial-core-2.0`. This is a local release candidate; no push, merge or deployment is part of RC3.

## Run locally

```bash
git clone -b blueprint-c-financial-core-2.0 My_Home_Finance_Blueprint_C_RC3.bundle My_Home_Finance_RC3
cd My_Home_Finance_RC3
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/my-home-finance/` in a separate test profile. Use a copy of your financial backup for UAT.

## Product Owner focus

1. **Home hero:** compare morning/afternoon/evening greeting against device local time. The full weekday/date should lead, with a smaller Welcome home. Select an image and a video in Settings; compare natural color/detail in both themes. Text has a localized scrim; the entire media surface has no dark overlay. Verify one sound toggle, independent music selection, reload, and only one audible source.
2. **Wealth:** switch Net Worth / Assets / Liabilities and all six history ranges. Check the explicit period label, sparse/empty history, mouse inspection, keyboard focus, and horizontal touch dragging. Crosshair and highlighted point must snap to actual observations. Reading the chart must not save history. Add Account creates manual accounts; More wealth actions retains snapshots and details.
3. **Home evidence:** open Spending, Budget, Recent Activity, Coming Up and Net Worth. Select a daily spending bar and inspect its transactions. Select an upcoming projected item to see its recurring rule; See all enters the full recurring experience.
4. **Spending:** check Overview / Breakdown / Budget / Transactions. Use previous/next month and the month picker. Compare actual monthly evidence, switch to the calendar, select a day, open a transaction and close it. The selected day/month must survive. Check category budget allocations against their transaction evidence.
5. **Back and Close:** drill from Home into Budget, then category transactions and transaction details. Close the transaction and use Back through the originating contexts. Repeat using browser/Android Back. Check filter, period picker and drawer dismissal before leaving the underlying page. Main Home remains a destination.
6. **Filters:** in Transactions, open Search and filters. Apply date bounds, type, account, group/category, lifecycle status, recurring frequency, description/merchant/notes search and amount limits. Date bounds intersect the selected reporting month. Verify Applied state, Clear filters, Apply filters, and cancellation restoring prior filters.
7. **Categories:** check original Home / Personal / Credit & Loan / Others groups and existing IDs/records. Search the expanded hierarchy in Settings → Categories and manual entry. Existing matching categories are reused. New defaults are additive and typed: Credit Card Payment / Savings Transfer are transfer classifications; Paycheck / Interest / Reimbursement are income classifications. Choosing a category never changes transaction type.
8. **Phones/themes:** check 320–390 px widths in dark/light themes; range buttons, date wrapping, calendar amounts, touch targets, native category selection, forms with the device keyboard, drawer/sheet scrolling and bottom padding. Verify actual device media codecs, autoplay permission and installed PWA behavior.
9. **Financial regression:** spot-check migrated totals, card payment transfer, expense/refund, savings contribution, recurring occurrence, statement review/duplicates and backup/restore. There is no new transaction model, automatic account connection or fabricated history.

## Engineering validation

```bash
npm run build
npm run qa
npm run test:core
npm run test:e2e
npm run test:pwa
```

The supplied Work environment uses the existing locked Playwright browser cache through `PLAYWRIGHT_BROWSERS_PATH`. No dependency or lockfile changes are required for RC3. Local media remains in IndexedDB and outside structured financial backups.
