# Blueprint C — Home + Spending reconstruction

## Scope and baseline

The requested scope is the full Home + Spending reconstruction (00–11), including H-02. The uploaded `My_Home_Finance_Blueprint_C_RC3.bundle` contains source code, release reports and UAT instructions, rather than a separate detailed blueprint specification. Its RC3 source at `4b3a2ce2f39fb4a66e56664c700d1ce521aa7592`, `RC3_UAT.md`, and the user's supplied section outline establish the implementation baseline here. Historical validation claims in the bundle are not evidence of this run; current results are recorded below.

The candidate is integrated on local branch `blueprint-c-home-spending`. The original checkout branch `work` and remote `origin/main` are preserved. The imported financial core is retained without modification. No live financial data, account connections, remote writes, deployment, or release promotion are needed for this reconstruction.

## Requirements traceability

| ID | Delivered experience | Implementation / acceptance evidence |
| --- | --- | --- |
| 00 | Isolated local development branch; production unchanged | Branch above; no push or merge |
| 01 | Preserve canonical IDs, integer cents, actual/forecast rules, transfers, refunds, migration, recurring, imports, backups | `src/core/` unchanged from uploaded RC3; `core-tests/run.cjs`, `tests/blueprint.spec.ts`, existing accepted regression suites |
| H-01 | Header with feature drawer, brand/Home destination and Settings | `BlueprintApp.tsx`, `rc2/NavigationDrawer.tsx`; RC2/RC3 navigation checks |
| H-02 | Local-time greeting, dominant weekday/date, smaller Welcome home; independent local image/video/music; one sound toggle and one audible source; localized text scrim; reduced motion | `rc2/HeroMedia.tsx`, `rc2/useLocalMedia.ts`; RC2 media and RC3 greeting/theme checks |
| H-03 | Net Worth / Assets / Liabilities, six ranges, real observations, pointer/touch/keyboard inspection, manual accounts | `rc2/Dashboard.tsx`; RC3 wealth/history checks |
| H-04 | Today plus previous six days, prior-week comparison, daily evidence | `rc2/Dashboard.tsx`; RC2 daily comparison checks |
| H-05 | Selected-month actuals, budget remaining/overspent, projections distinctly labelled, category drill-down | Dashboard and Spending Budget; RC3 budget evidence checks |
| H-06 | Pending/scheduled obligations and recurring projections, source detail, full recurring destination | Dashboard; RC3 Upcoming checks |
| H-07 | Recent records open canonical detail; full transaction destination | Dashboard and transaction detail; canonical/RC3 checks |
| S-01 | Selected-month total spending and previous-month comparison; actual income | Spending Overview; financial/core checks |
| S-02 | Monthly daily bars and weekly seven-day groups; proportional actual amounts, signed refund values, real month boundaries and evidence drill-down | `rc3/SpendingActivity.tsx`; `tests/home-spending.spec.ts` |
| S-03 | Month calendar, day selection, actual amounts and distinct projections; context survives detail Close and Back | `BlueprintApp.tsx`; RC3 day/Back checks |
| S-04 | Group/category breakdown, largest and most frequent expense evidence | Spending Breakdown; canonical browser suite |
| S-05 | Planned/actual income, budgeted/actual spending, category allocations and projected remaining | Spending Budget; RC3 budget and mobile form checks |
| S-06 | Transaction tab, canonical detail, editing/status/refund/copy/move/recovery retained | Canonical browser and accepted regression suites |
| S-07 | Search, month-intersected dates, type, account, group/category, lifecycle, frequency and amount limits; apply/clear/cancel | Transaction filters; RC3 coherent-filter checks |
| 04 | Home / Spending / Investment / Savings / far-right Quick; grouped feature drawer; contextual Back | NavigationDrawer and `rc3/useContextHistory.ts`; RC2/RC3 navigation checks |
| 05 | Existing category IDs/groups retained; additive typed hierarchy; searchable native selection | `src/core/categoryDefaults.ts`, `rc3/CategorySelect.tsx`; core/RC3 category checks |
| 06 | Both themes; 320/390/768/1440 layouts; scroll contained within chart/dialog; touch controls | `blueprint.css`; RC2/RC3 and reconstruction responsive checks |
| 07 | Associated form labels, modal keyboard behavior, chart observation controls, roving tab focus and labelled tab panel | `rc3/SpendingTabs.tsx`; existing keyboard checks and reconstruction tab test |
| 08 | No financial-model rewrite, bank linking, fabricated observations, category-driven transaction-type change, or production promotion | Unchanged RC3 financial core; category/history assertions |
| 09 | Requirement-to-source and acceptance mapping | This table |
| 10 | Build, static QA, core, browser, theme/viewport screenshots, production offline/update checks | Current-run results below; generated `qa-output/` screenshots |
| 11 | Physical-device media/install/offline and PO runtime acceptance remain manual | UAT sequence below; `RC3_UAT.md` |

Home reading order follows H-03 through H-07: wealth, spending snapshot, budget, upcoming, recent activity. Desktop pairs spending with budget and upcoming with recent activity; mobile follows that same order.

## Current-run validation

| Check | Current candidate result |
| --- | --- |
| `npm ci` | Passed with the supplied lockfile |
| `npm run build` | Passed, including TypeScript and Vite production bundle |
| `npm run qa` | 14 checks passed |
| `npm run test:core` | 33 passed, 0 failed/skipped |
| Browser suite | 69 distinct checks validated: 68 passed in the full run; corrected Home reading-order assertion passed on targeted rerun; 0 skipped |
| `npm run test:pwa -- --workers=1` | 2 passed, 0 failed/skipped; real worker update, offline shell/navigation and persisted local media |
| Financial-core / dependency preservation | `src/core/`, `package.json`, `package-lock.json` unchanged from uploaded RC3 |
| `git diff --check` | Passed |

The initial, unmodified uploaded RC3 passed all 64 existing browser checks. The first final run exposed a test-selector mistake: a broad CSS heading selector included the hidden period-picker dialog. The reading-order assertion now uses visible accessible headings; its targeted rerun passed without changing product code or weakening the expected order. The reconstruction adds five focused browser tests. Final runs use the standard npm scripts with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/lib/chromium/chromium` and two browser workers. Both Playwright configurations now accept this optional executable override; dependency versions and lockfile remain unchanged from uploaded RC3.

Screenshots are generated under ignored `qa-output/`. Coverage includes dark/light themes and 320, 390, 768 and 1440-pixel widths, Home, Spending tabs, calendar, dialogs and keyboard checks. Linux Chromium automation does not establish physical iOS/Android installation or PO acceptance.

## Product Owner UAT

1. Run `npm ci`, `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4173` from the project directory. Use the `/my-home-finance/` path in a separate test browser profile with a **copy** of a financial backup.
2. Compare migrated balances, budgets, refunds, card transfers and savings against the accepted data. Export and restore a backup in a second isolated profile.
3. Inspect Home in both themes: greeting/date, local hero image/video, independent music selection, sound toggle, wealth ranges, spending evidence, budget, upcoming and recent activity.
4. In Spending, switch monthly/weekly charts and inspect bars; use Calendar, Breakdown, Budget and Transactions. Test month changes, category evidence, filters, Close and browser/Android Back.
5. On an actual phone, test media codecs/autoplay permissions, keyboard/form scrolling, touch charts, standalone installation and offline relaunch. Headless Chromium results do not replace this device acceptance.
6. Record PO acceptance or reproducible discrepancies. Publishing/merging is a separate action.

Additional production visual smoke: uploaded the bundled home image through Settings, verified its decoded image in both themes at 390 px, checked overflow, and verified IndexedDB persistence after reload. Screenshots: `qa-output/reconstruction-hero-dark-390.png`, `qa-output/reconstruction-hero-light-390.png`. Representative Home and Spending screenshots were visually inspected.
