# My Home Finance Blueprint C release candidate completion report

The Blueprint C engineering release candidate is implemented on an isolated development branch. The final build and automated validation pass. Production has not been changed, pushed, merged, or promoted. Product Owner runtime acceptance and real-device installation remain the final release gates.

## Repository and release identity

| Item | Result |
| --- | --- |
| Repository lineage | abdullatanbir/my-home-finance |
| Authoritative source | Supplied accepted-baseline Git bundle, verified with `git bundle verify` |
| Protected branch | `V-27-Development` |
| Protected baseline | `9b9f95c66fd717bcbc557836efddd9341fe75a2e` |
| Development branch | `blueprint-c-financial-core-2.0` |
| Isolated working repository | `/workspace/scratch/4c01dd73b0c4/blueprint-c` |
| Implementation commit | `ccdd7d7c6b166458690a368db7e615d4a2cf5025` |
| Report commit | The documentation commit immediately following the implementation commit; resolve with `git log -1 --format=%H -- BLUEPRINT_C_RELEASE_CANDIDATE.md` |
| Pushes and merges | None |
| Accepted history | Unchanged; protected branch still resolves to the baseline above |
| Source/dependency safety | No use of the stale workspaces; no force push, history rewrite, dependency-version change, or lockfile regeneration |

The portable RC Git bundle includes the development and protected baseline branch references and their complete history. It excludes dependency caches, browser binaries, browser profiles, test screenshots, and generated build output.

## Completion against E01 through E12

| Epic | Engineering status | Delivered behavior |
| --- | --- | --- |
| E01 Financial Core and Migration | Implemented | Canonical entity IDs, integer cents, separate transaction type/lifecycle, schema 5, explicit legacy migration and shared financial calculations. |
| E02 Design System and Navigation | Implemented | Responsive dark/light architecture; locked Home, Spending, Investment, Savings, far-right Quick action; grouped feature menu and Settings. |
| E03 Accounts, Cards and Transactions | Implemented | Seven manual account types, opening balances, paid-from/deposited-to/from-to relationships, account history, archive/reactivate, canonical detail/edit/status/refund, copy/move, Recently Deleted and restore. |
| E04 Home, Overview and Net Worth | Implemented | Home-only ambient player, Net Worth, today plus six preceding calendar days of spending, budget status, upcoming obligations, recent activity, account drilldown and saved Net Worth snapshots. |
| E05 Spending | Implemented | Overview/Breakdown/Budget tabs, period selection, weekly chart/calendar, actual spending, prior-period comparison, largest/frequent expense evidence, search and progressive filters. |
| E06 Budget | Implemented | Planned versus actual income, budgeted versus actual spending, group/category allocations, canonical actuals, explicitly labelled Projected Remaining. |
| E07 Calendar and Recurring | Implemented | Month/day financial browser, daily summary and detail, explicit lifecycle labels, deterministic occurrence IDs, future projections, due materialization and pause/resume. Accepted legacy recurring engine remains intact. |
| E08 Savings and Investments | Implemented | Arbitrary savings goals and contribution history; allocation or owned-account transfer; funded manual investments, valuation history and actual saved-value charts; asset values counted once. |
| E09 Statement Import | Implemented within the parser boundaries below | Local CSV mapping, debit/credit parsing, digital-PDF text/row extraction, staging, validation, classification, duplicate review, explicit approval, provenance, local rules, import history and guarded batch undo. |
| E10 Reports | Implemented | Visual cash flow, KPIs, explanation and evidence; category/group and canonical transaction drilldowns; actuals separated from forecasts; print/Save PDF and filtered evidence export. |
| E11 Ambient Player and Settings | Implemented | Global audio element across SPA navigation; local MP3/artwork selection, replacement/removal, mute/volume; IndexedDB binary persistence; theme, categories, rules, accounts and recovery settings. |
| E12 Backup, Migration, QA and Release | RC engineering complete | Backup schema 5 plus versions 1–4 restore, recovery snapshots, passing core/browser/PWA validation and local release commits. PO acceptance and production promotion remain outstanding. |

The old Home/Expense/navigation surfaces are superseded by the Blueprint C views. The original UI is retained only in development mode for accepted-release regression and compatibility checks. Production routes use the canonical store. The canonical UI provides copy/move, Recently Deleted, restore, print and evidence export without requiring the former UI.

## Material modules added or changed

| Path | Purpose |
| --- | --- |
| `src/core/model.ts` | Canonical store/entity contracts, IDs, integer-money conversion and formatting. |
| `src/core/engine.ts` | Actuals, cash flow, balances, liabilities, Net Worth, budgets, contributions, recurrence, comparison and transaction validation. |
| `src/core/migration.ts` | Explicit legacy versions 1–4 migration, stable-ID adaptation, preserved source envelope and schema validation. |
| `src/core/store.ts` | Canonical persistence, subscriptions, mutation boundary, legacy reconciliation, backup/restore and recovery copies. |
| `src/core/imports.ts` | CSV/digital-PDF parsers, mappings, staging, rules, duplicates, approval and guarded undo. |
| `src/core/media.ts` | IndexedDB binary media persistence. |
| `src/components/BlueprintApp.tsx` | Blueprint C shell, workspaces, forms, canonical detail and accessible native dialogs. |
| `src/components/blueprint.css` | Shared themes, responsive layouts, charts, dialogs and report print styling. |
| `src/App.tsx` | Default Blueprint C runtime and lazy development-only accepted-workspace regression path. |
| `src/main.tsx` | Production-only service-worker registration; prevents development caching from masking changes. |
| `public/sw.js`, `vite.config.ts` | Build-versioned cache, full hashed-asset precache, network-first navigation, offline fallback and explicit waiting-worker activation. |
| `core-tests/run.cjs` | Dependency-free Node financial/import/migration/backup regression runner using the locked TypeScript compiler. |
| `tests/blueprint.spec.ts` | Blueprint C critical journeys, theme/viewport checks and keyboard checks. |
| `tests/fixture.ts`, existing four spec files | Fixed accepted-scenario date; existing assertions retained. Legacy regression explicitly selects the retained development workspace. |
| `playwright.pwa.config.ts`, `pwa-tests/offline.spec.ts` | Built-production PWA test including a real service-worker update and offline reload. |
| `package.json`, `.gitignore` | Validation commands and generated-artifact exclusions. Dependency declarations are unchanged. |

## Schema, migration and recovery

The structured canonical schema and financial backup version are **5**. The canonical storage key is `my-home-finance-financial-core`. Money authority is integer USD cents. Categories and goals use stable internal identifiers rather than display-name relationships.

Supported backup versions 1, 2, 3 and 4 migrate automatically. Existing transaction IDs, historical dates, recurring occurrence IDs, savings carry-forward balances, contributions, budgets, deleted transactions and the original legacy payload are retained. No user account ownership is guessed. Historical records without an account remain unassigned until the user deliberately assigns them.

Before first migration, the original legacy JSON is retained under `mhf-pre-blueprint-c-backup`. Before restore, the current canonical state is retained under `mhf-before-restore`. The recovery files can be downloaded in Backup / Restore. Invalid data and unsupported versions produce an error instead of silently replacing the store with an empty one.

Pre/post migration tests verify monetary totals in cents and stable IDs for supported versions. Canonical backup export/restore preserves the serialized structured state. The browser suite separately exercises restore with live application data.

Large MP3 and artwork binaries remain in IndexedDB and are intentionally excluded from financial backups. Original statement files are not retained in the store or uploaded. Approved transaction metadata and review/history records remain for traceability.

## Validation results

| Validation | Final result |
| --- | --- |
| Accepted baseline production build | Passed before feature work |
| Accepted baseline static QA | 14 passed, 0 failed |
| Accepted baseline browser scenarios | 7 passed, 0 failed after making the scenario date deterministic |
| Final `npm run build` | Passed; TypeScript and Vite production build successful |
| Final `npm run qa` | 14 passed, 0 failed |
| Final `npm run test:core` | **32 passed, 0 failed** |
| Final `npm run test:e2e` | **29 passed, 0 failed** |
| Final `npm run test:pwa` | **1 passed, 0 failed** |
| Combined final Playwright result | **30 passed, 0 failed** across the two suites |
| Lockfile integrity | `package-lock.json` unchanged from the accepted baseline |
| Whitespace check | `git diff --check` passed |

The first unmodified baseline browser run had 3 passes and 4 failures because its scenarios hard-coded October 13, 2026 while the actual date was October 19. The fixture now fixes wall time to the scenario date while allowing timers to run. No financial assertion was removed or relaxed.

Core coverage includes checking and card purchases, income, transfer/card-payment neutrality, full/partial and excessive refunds, duplicate reversal protection, savings allocation/transfer, investment funding and saved valuations, same-day valuation ordering, recurring projections/materialization/cadences, budgets, cash flow, Net Worth, signed period comparison and zero previous periods. It also covers legacy migration, canonical restore, malformed CSV/date validation, mappings, local rules, duplicates, card-payment direction, PDF review gating and safe undo including trashed imported records.

Browser coverage includes the accepted seven scenarios plus canonical detail/account history/reload, card purchase/payment, goal contribution, investment funding and valuation updates, future recurring materialization exactly once, CSV staging/approval/reload/duplicate review/undo, card-statement payment direction, refund-adjusted budgets/reports, PDF staging/review, backup restore, media persistence/navigation, migration/compatibility reconciliation, canonical copy/move/trash restoration and dialog keyboard behavior.

## Responsive, theme and accessibility QA

Home was exercised at widths **390, 768 and 1440 pixels in both dark and light themes**. Every major workspace plus Spending's three tabs was exercised at mobile width in both themes with horizontal-overflow assertions and screenshots. Representative mobile/desktop screenshots were visually inspected. Both themes share the same forms and component structure.

Form controls have explicit associated labels. Native modal dialogs support keyboard dismissal, focus containment and return focus. Primary navigation has meaningful accessible labels/current-state markers. Financial lifecycle states are written as text rather than relying on color alone. Saved-history charts have textual accessible descriptions and inspectable evidence.

These are Chromium Linux checks. They do not substitute for final physical-device Safari/iOS/Android validation or a comprehensive independent accessibility audit.

## PWA validation

The production suite verified the GitHub Pages base path `/my-home-finance/`, standalone manifest, controlling service worker, cached JavaScript/CSS, an actual waiting-worker update, explicit activation, obsolete-cache cleanup, offline reload and offline navigation into Spending. The test temporarily modifies only generated `dist/sw.js`, restores it in `finally`, and never changes the source or protected branch.

The update test identified a `Vary: Origin` cache-match problem after activating a new worker. Same-origin static asset matching now handles that variation correctly; the update-and-offline test passes.

An installed app's real OS launch/install UI is not available inside headless browser automation. Physical installation and standalone launch are final PO UAT items, not claimed as completed hardware validation. No production deployment occurred.

## Boundaries and documented implementation choices

- **PDF:** supported digital text streams and recognizable date/description/amount rows are extracted locally. PDF rows always require stronger review. Encrypted, scanned and unsupported-font PDFs fail closed; use a CSV export or manually verify/correct the review rows. There is no OCR or promise of universal bank-layout recognition.
- **CSV:** signed Amount convention is negative debit/positive credit; separate Debit/Credit columns and manual header mapping are supported. Account selection is explicit. Ambiguous credits and duplicate candidates require review. OFX/QFX remain an extension boundary; no parser or live bank integration is claimed.
- **Actuals:** only posted/paid records dated on or before the as-of date qualify. Pending/scheduled items remain obligations/projections until paid/posted. Legacy unpaid expenses migrate to pending, preserving their unpaid state rather than assuming settlement.
- **Investments:** valuations are manually saved in date order; multiple entries on one day retain their audit history and the newest saved value wins. Funding is a transfer to a dedicated asset account; the investment's display value is not counted as a second asset.
- **History:** charts show actual saved snapshots/valuations. Missing dates are not synthesized.
- **Legacy balances:** account ownership is not inferred. Check opening-balance dates before assigning old transactions to avoid double counting imported opening balances.
- **Import undo:** edited or externally linked records block automatic undo. Undo cancels batch transactions, including recoverable trashed records, so restoring trash cannot reactivate an undone import.
- **Audio:** browser autoplay rules still apply. Track/artwork files remain device-local and outside financial backup files.
- **Release status:** engineering RC complete; PO runtime acceptance and any merge/deployment approval are still required. No remote branch or production release has been updated.

## Exact final UAT instructions

Use an isolated browser profile/test state and a copy of your financial backup. Keep your accepted production session separate.

To recover the candidate from the delivered Git bundle:

```bash
git clone -b blueprint-c-financial-core-2.0 My_Home_Finance_Blueprint_C_RC.bundle My_Home_Finance_Blueprint_C
cd My_Home_Finance_Blueprint_C
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/my-home-finance/`. Preview uses the production build and service worker. `npm run dev` is available for engineering, but production preview is the appropriate final PWA/UAT runtime.

1. Restore a copy of your accepted backup. Check representative historical months, budgets, savings balances/contributions and recurring rules against the accepted app. Download a new version-5 backup and confirm restore in another isolated test profile.
2. Create a checking account and card with verified opening balances. Add a purchase and record the card payment as Checking → Card. Confirm Spending counts the purchase once and account balances/Net Worth are correct. Check a partial refund and canonical detail.
3. Add a savings goal/contribution and a funded manual investment. Update its valuation. Confirm neither contribution becomes spending and assets are counted once.
4. Import a small real CSV into an explicitly selected account. Review categories, duplicate candidates, refunds and card payments before approval. Inspect resulting Account, Calendar, Spending and Report evidence; test undo in the isolated state.
5. On your actual phone, check the main views and Quick Add in both themes; install/open standalone, navigate with a local track playing, then test an offline relaunch after the shell has cached. Confirm controls and totals are readable and comfortable.
6. Accept the RC runtime or report any reproducible discrepancy. Promotion/merge/deployment is a separate approval step; the accepted production branch is still protected.

For engineering reruns, use `npm run qa`, `npm run test:core`, `npm run test:e2e`, then `npm run build` and `npm run test:pwa`. In this Work environment the supplied Linux browser cache is selected using `PLAYWRIGHT_BROWSERS_PATH=/workspace/scratch/4c01dd73b0c4/playwright-cache-blueprint-c`.
