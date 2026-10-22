# Blueprint C — Home + Spending reconstruction acceptance

## Candidate and safety

Implementation branch: `blueprint-c-home-spending-reconstruction`.
Source baseline: `a5d1dc45ba6f10d30503b114f6a348899b3c7655` (`blueprint-c-home-spending`).
Protected production: `V-27-Development` at `9b9f95c66fd717bcbc557836efddd9341fe75a2e`.
The prior RC3 and Home/Spending candidates are rejected UX baselines. Their historical acceptance documents are not evidence of this reconstruction.

The financial core, storage/migrations, imports, canonical transaction actions and local-media controller are retained. No changes to `src/core/`, `src/lib/`, dependency declarations, lockfile, or the service-worker source are part of this reconstruction. The build precache additionally includes the existing bundled default Home artwork so that it is available offline. No backend, bank credentials, AI advice, external finance integration, production merge or deployment was introduced.

Product Owner acceptance remains required. PASS below means implementation and the recorded engineering checks passed; it does not mean Product Owner UAT approval.

## Experience changes

Home now uses a compact ambient image/video hero with local-time greeting, graded weekday/date/year, a deterministic short motivational line, localized contrast treatment, and a circular media control. The old horizontal player, Home filenames and “Welcome home.” are removed. Desktop financial position uses a metric/chart composition with visible Assets and Liabilities; mobile deliberately reflows it. Add Account is primary and snapshots remain secondary. Spending and Budget snapshots use explicit evidence and contextual destinations, followed by recurring obligations and recent canonical activity.

Spending is a dedicated workspace, rather than a chart/calendar toggle. Overview combines a monthly summary, daily/weekly chart, persistent analysis calendar and evidence panel. Breakdown partitions transactions into categories or groups once, with largest/frequent expense drilldowns. Budget shows planned, spent, remaining/overspent, projections and category allocations with evidence. Transactions directly exposes the canonical filters and detail/actions inside the workspace. Analysis drilldowns clear unrelated stale transaction filters; ordinary tab navigation preserves relevant context.

The reporting selector and month navigation are bounded to **2026–2050 inclusive**. Existing historical dates are preserved in storage and financial calculations; the UI does not add older years to the approved selector. Day and range inspection use same-document browser history. Home’s seven-day evidence can span month boundaries while the Transactions filters continue to intersect the selected month explicitly.

## Validation record

Final command results are recorded at completion below. No skipped or zero-test result is counted as validation.

- Node.js 24; frozen dependency install: `npm ci --ignore-scripts`.
- TypeScript and production bundle: `npm run build`.
- Financial Core: `npm run test:core` — 33 tests passed.
- Static QA: `npm run qa` — all 14 checks passed.
- Browser regression: `npm run test:e2e -- --workers=2` — 87 tests passed, none skipped. The 18 reconstruction cases were then rerun successfully after tightening their fixtures to use typed Income/Transfer categories and a valid owned savings-transfer destination; application source was unchanged.
- Production PWA/offline: `npm run test:pwa -- --workers=1` — 2 tests passed, none skipped.
- `git diff --check`: passed.

Browser commands use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` in this machine and `--workers=2` for regressions, `--workers=1` for the production PWA suite. Normal Playwright-managed Chromium works without that override.

`tests/reconstruction.spec.ts` uses explicit test-only data and a fixed local date, October 21, 2026. It exercises signed refunds, pending activity, transfers, income, sparse observations, overspending, the year bounds, month-intersected filters, day/range navigation, cross-month Home evidence, and local media. `tests/home-spending.spec.ts` separately retains leap-day and future-date coverage. No synthetic history is inserted into the application by presentation components.

Earlier RC2/RC3 tests were updated only where the new specification supersedes the expected greeting/date hierarchy, player controls, calendar toggle, budget presentation, or historical year-selector behavior. The old 2025 test now requires that the record remain unchanged while 2025 is absent from the selector. Financial assertions, transaction actions, import/recovery checks and offline behavior remain exercised.

## Visual and runtime evidence

Rendered Chromium screenshots were opened and inspected, beyond source inspection and passing tests. Home and all four Spending areas were exercised at **320, 390, 768 and 1440px**, in dark and light themes, with native 900px-height viewports. Inspections covered a bright actual image, signed refund day, selected calendar day, overspent budget, transaction detail, filter surfaces, range controls and navigation. Initial screenshots prompted tighter mobile spacing, localized hero-text contrast, explicit budget labels, ordered recent evidence, and removal of duplicate day rows. At 390px the compact hero is approximately 200px tall and financial content begins within the first 320px. No unintended document-level horizontal scrolling was observed.

Generated evidence is under `qa-output/final-{theme}-{width}-{surface}.png`, where surface includes `home`, `wealth`, `Overview`, `Breakdown`, `Budget`, `Transactions`, `calendar`, `detail` and `filters`. The tests regenerate these files. Representative inspected images are retained in [docs/blueprint-c](docs/blueprint-c/). Full-page screenshots naturally show the fixed primary navigation at the capture viewport’s bottom; it remains fixed while scrolling.

## Requirements traceability

| ID | Requirement | Implementation | Automated evidence | Visual/runtime evidence | Status |
| --- | --- | --- | --- | --- | --- |
| P-01 | Isolated candidate; protect production | Candidate branch above; no protected-ref writes | Git status/ref checks | No merge, push or deployment executed | PASS |
| C-01 | Stable Financial Core 2.0 and integer-cent semantics | Existing core/engine/store retained | 33 core tests; canonical browser suite | Refund, transfer, income and pending test records inspected | PASS |
| C-02 | Accounts, savings, investments and Net Worth calculations | Existing canonical actions and calculations | `blueprint.spec.ts`, core tests | Financial position and account detail exercised | PASS |
| C-03 | Recurrence, imports, duplicate handling, migration and backup compatibility | Existing engine/import/storage paths | Core suite, `recurring.spec.ts`, canonical import/backup/recovery cases | Upcoming opens actual recurring/source details | PASS |
| H-01 | Header, drawer, Settings and reading order | Header + Dashboard hierarchy | RC2 drawer/focus tests; Home reading-order test | Both themes, 320/390/768/1440 Home | PASS |
| H-02 | Medium hero, local greeting, graded weekday/date/year, motivation; remove old greeting | `rc2/HeroMedia.tsx`, experience styles | Hero hierarchy and viewport test; RC3 time checks | Bright artwork at mobile and desktop; financial content visible below hero | PASS |
| H-03 | Natural image/video; preserve local persistence and music settings | Existing IndexedDB/controller; localized text gradient | RC2 media persistence/coordination; PWA media test | Image and video runtime; no blanket image filter | PASS |
| H-04 | Circular accessible player, active rotation, paused state and reduced motion | Hero button, orbit disc, state label/focus | Media keyboard/source/reduced-motion test | Small lower-left control; no raw filename or horizontal player | PASS |
| H-05 | Net Worth, Assets, Liabilities, six ranges, real chart evidence and Add Account | `rc2/Dashboard.tsx` wealth panel | RC2/RC3 real history, pointer, touch, keyboard and account tests | Mobile wealth and desktop split composition | PASS |
| H-06 | Actual recent spending and contextual day/range drilldown | Dashboard + workspace range/day context | RC2 daily comparison; Home day and cross-month tests | Home bars and selected-day Overview evidence | PASS |
| H-07 | Planned, spent, remaining/overspent; same-month Budget destination | Home budget + Spending Budget | Home budget/category/detail test; canonical refund-budget test | Explicit $25 overspent and three-part summary in seeded case | PASS |
| H-08 | Upcoming obligations and recurring/source detail | Canonical pending/scheduled rows and recurring projections | RC3 Upcoming test | Coming up rows and recurring dialog | PASS |
| H-09 | Recent canonical activity; Close/Back returns Home | Existing detail dialog and context history | Home recent focus/origin test | Recent activity and canonical detail inspected | PASS |
| S-01 | Four distinct Spending experiences | `experience/SpendingWorkspace.tsx` | Tab/panel/keyboard tests; eight theme/viewport cases | Overview, Breakdown, Budget, Transactions in both themes | PASS |
| S-02 | Monthly total, previous comparison, income and supporting evidence | Overview summary and evidence panels | Signed canonical-spending agreement test | Monthly summary, previous month and income labels | PASS |
| S-03 | Daily/weekly charts, proportional amounts, refunds, sparse/future/leap dates | Existing canonical SpendingActivity; Home zero bars have zero height | Leap-February, future-day, monthly/weekly tests | Positive/refund bars and disabled future bins | PASS |
| S-04 | First-class calendar, month/year navigation, intensity, today and selection | Shared `experience/SpendingCalendar.tsx` | Day/detail/Back, bounded year and viewport tests | Selected purple day, today marker, green refund and evidence | PASS |
| S-05 | Exact 2026–2050 selector; retain historical data | Bounded PeriodPicker and navigation controls | Exact 25 options, both bounds, preserved 2025 record | Year picker and boundary month controls exercised | PASS |
| S-06 | Category/group breakdown, largest/frequent evidence, compatible IDs | Independent grouping, canonical IDs, drilldowns | Partition/totals agreement; RC3 category preservation tests | Composition bars, category rows, largest/frequent surfaces | PASS |
| S-07 | Searchable typed category hierarchy and original groups | Existing CategorySelect and defaults retained | Core category idempotence and RC3 hierarchy tests | Category and canonical entry filters exercised | PASS |
| S-08 | Budget analysis, allocations, progress, projections and underlying transactions | Budget workspace; canonical budgetSummary | Budget overspend/category/drilldown and canonical refund tests | Planned/spent/overspent; category progress; evidence cards | PASS |
| S-09 | Full transaction exploration and canonical actions | Workspace reuses canonical rows, filters and detail | Canonical edit/status/refund/copy/move/recovery; filter cases | Transactions and native filter/detail dialogs | PASS |
| N-01 | Home/Spending month/day/tab/category/detail origin and Back | Same-document context history; relevant inspection state | Day/range/Close/Back and Home category tests | Detail closes to selected day/category or Home | PASS |
| N-02 | No stale filters on analysis drilldown; cancel draft filters with Back | Shared canonical filter dialog + explicit reset for analysis | Analysis-drilldown and draft-date/Back edge-case test passed | Filter dialog, empty/matching states inspected | PASS |
| N-03 | Home / Spending / Investment / Savings / far-right Quick; preserve drawer | Existing primary/drawer architecture retained | RC2 drawer and canonical Quick tests | Bottom navigation on all rendered viewports | PASS |
| V-01 | Coherent responsive light/dark UI at four widths | `experience/experience.css` and existing semantic variables | Eight theme/viewport cases; document overflow assertions | All specified viewports and four Spending areas inspected | PASS |
| A-01 | Focus, keyboard, modal semantics, tab semantics, chart observation | Native controls/dialogs; roving tabs; SVG point controls | RC2/RC3 focus/touch/keyboard and reduced-motion checks | Focused player, detail and filter surfaces inspected | PASS |
| PWA-01 | GitHub Pages base, offline shell/media and update lifecycle | Existing worker behavior + additive default-artwork precache | Two production PWA tests, including update/activation and offline media | Offline Home and Spending successfully exercised | PASS |
| X-01 | No bank connection, financial-product sales, AI advice or copied reference assets | Local-only experience with existing artwork | Unchanged dependency/core paths; static QA | Existing My Home Finance identity and manual data entry | PASS |

## Limitations and Product Owner UAT

- Automated runtime evidence is Chromium on Linux. Physical Windows/mobile devices, iOS installation, device-specific audio/video codecs, and actual user-preferred media remain Product Owner UAT checks.
- The year selector deliberately excludes historical years outside 2026–2050. Stored records remain intact and included wherever canonical all-history calculations apply; this reconstruction does not add a second historical selector.
- Daily/monthly chart bars scroll inside the chart region on narrow screens; the document itself does not scroll horizontally.
- The candidate has no production promotion or remote publication. A local Git bundle can transfer the completed branch without writing any remote ref.

## Windows UAT handoff

Use a separate browser profile and a backup copy for UAT. Financial JSON backups do not include local media binaries. The following commands consume the **completed Git bundle**, placed in `C:\Java-Training\my home finance-2026`; they do not depend on an unpublished remote branch:

```powershell
Set-Location 'C:\Java-Training\my home finance-2026'
git clone --branch blueprint-c-home-spending-reconstruction .\blueprint-c-home-spending-reconstruction.bundle .\blueprint-c-reconstruction-uat
Set-Location .\blueprint-c-reconstruction-uat
npm.cmd ci --ignore-scripts
npm.cmd run build
npm.cmd run preview -- --host 0.0.0.0 --port 4173
```

The terminal reports the `/my-home-finance/` application path. Test hero/media, Net Worth ranges, Home day/Budget/Recent links, the four Spending areas, year bounds, detail Close/Back, backup/restore and offline reopening. Final Product Owner acceptance remains required before any separately authorized production promotion.
