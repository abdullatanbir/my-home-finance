# Home Page Design Specification v2 — candidate record

## Identity and scope

Source branch: `blueprint-c-home-spending-reconstruction`.
Source HEAD: `8909380a43f559e195842cc145e49df154be69e9`.
Candidate branch: `home-page-design-candidate`.
Protected production: `V-27-Development` at `9b9f95c66fd717bcbc557836efddd9341fe75a2e`.

This is a separate Home design experiment based on the Product Owner’s **Home Page Design Specification v2**, supplied in chat. It intentionally supersedes previous Home presentation, history-range and primary-navigation choices. Previous Blueprint C acceptance records are historical, not evidence that this candidate conforms to v2. Product Owner UAT has not been granted.

## Architecture and data boundaries

- `home-v2/HomeCommandCenter.tsx` owns the Home narrative, local day inspection, budget health and next-step links. Cards stay in the requested sequence at all widths: Daily Focus → Net Worth → Spent Last 7 Days → Budget → Coming Up → Recent Activity. Guidance follows activity; navigation and the purple copilot entry remain fixed.
- `rc2/HeroMedia.tsx` retains the existing image/video/music controller and IndexedDB persistence. Its v2 presentation adds editorial focus words, a full local date/year and a glass text surface. No filename is exposed on Home.
- `rc2/Dashboard.tsx` retains canonical Net Worth/Assets/Liabilities calculations and observed-history charts. The v2 wealth panel uses exactly **1W, 1M, 3M, YTD, ALL**, signed delta plus percentage when a nonzero prior observation exists, a primary Add Account action, and a Forecast destination. Zero-history and zero-denominator cases remain explicit.
- `home-v2/Forecast.tsx` is a local **scenario** surface. It starts from actual current Net Worth and month-to-date income/spending; editable monthly assumptions are not a forecast service or a prediction. Cent-precision arithmetic, explicit horizon and assumptions produce a cash-flow table and scenario Net Worth. No financial records, budgets, valuations or snapshots are written.
- `home-v2/Assistant.tsx` defines `AssistantAdapter.ask({question, signal})`. The application injects **no adapter**. No credentials, network requests, financial context, fake answers or chat persistence are added. A configured adapter boundary supports cancellation, loading, answer, error and retry; the default surface clearly explains unavailable external analysis. Test-only provider answers live in a fixture harness under `tests/fixtures`, which is not emitted into the production bundle.
- `home-v2/PersonalSettings.tsx` offers a device-local profile display name and notification preference. They use a separate nonfinancial localStorage key, not a financial schema extension. Notification delivery and online profiles are not connected services. The saved preference is labelled as such; no browser permission or push-subscription flow is fabricated.
- Canonical transaction rows/details, lifecycle/actions, accounts, category IDs, imports, recurring rules, backup/migrations, savings, investment calculations and financial persistence remain intact. `src/core/`, `src/lib/`, dependency declarations/lockfile, service-worker source, deployment configuration and workflow files are unchanged.

Home always renders dark (`#050505` base) without rewriting the saved appearance preference. Other workspaces continue to honor that preference. The v2 primary navigation is **Home / Accounts / Spending / Budget / AI**. Quick Add remains on Home and in the drawer; Goals maps to existing Savings, and Investments remains in the drawer. Native same-document history preserves canonical detail origins and dismisses the assistant with Back. The copilot entry and AI navigation expose a single active pill.

## Financial presentation policies

Recent spending is actual canonical Expense less Refund over today and the preceding six local calendar dates. Transfers and savings allocations do not become consumption. The grid shows exact day amounts; selecting a tile changes local evidence and its selected state. An explicit Details action enters the corresponding Spending day. On small screens the seven tiles scroll **inside** their card to retain readable amounts rather than squeezing seven values into tiny columns.

Home Budget always follows the current local month and refreshes across date/month changes while open. It shows Left To Spend, or an explicit over-budget label, consumed progress, “Spent X of Y”, and health. Presentation thresholds are documented rather than added to the financial engine: Healthy below 75%; Caution from 75% to below 90%; Risk from 90% through 100%; Exceeded above 100%. No plan yields “Not planned” and an empty progress bar. Budget planning never creates transactions.

Coming Up merges actual pending/scheduled source records and canonical recurring projections chronologically. Expense, Income and Savings projections come from existing supported rule types. A pending/scheduled transaction linked to an existing investment displays its Investment context while retaining its canonical transaction type; no new recurring investment model or fictitious valuation is introduced.

Recent Activity supports all canonical transaction types and statuses, with vector type icons, description, local date, account, amount, category and lifecycle. Next-step links are deterministic local navigation based on missing accounts/budgets or budget overage; they are not presented as AI-generated advice.

## Validation

Validation uses Node.js 24, Python 3 and system Chromium with the Playwright executable override.

- Frozen dependency state reused from the verified source checkout; no dependency changes.
- `npm run build`: TypeScript and production bundle pass.
- `npm run test:core`: **33 tests pass**, none skipped.
- `npm run qa`: **14 checks pass**.
- Browser suite: **106 tests pass**, none skipped. After the final compositor/backdrop optimization and stricter hero-bound check, the **37 affected Home/reconstruction cases also pass**, none skipped. A subsequent browser-default mobile dialog width cap was removed; all **19 v2 cases passed again**, including exact full-width sheet assertions at 320/390px. Final screenshots fast-forward finite animations to capture the settled layout; animation behavior and timing were inspected separately.
- Production PWA/offline suite: **2 tests pass**, including offline Home, Spending, assistant unavailable UI, local scenarios, IndexedDB media reload, cache replacement and waiting-worker activation.
- `git diff --check`: pass.

New `tests/home-design.spec.ts` exercises negative Net Worth and signed delta, exact five ranges and YTD cutoff, dark Home without overwriting theme, every budget-health state, local-day evidence, source details, future investment commitments, integer-cent scenarios/no writes, AI no-external-request/no-storage behavior, actual adapter loading/error/retry/answer states, keyboard/focus/Back, reduced motion and all required viewports with both empty and populated data. Earlier regressions were adapted only where v2 deliberately changes presentation, date punctuation, daily-detail interaction, navigation or Home card headings. Financial assertions are retained.

## Rendered inspection and animation evidence

Actual Chromium-rendered Home, daily focus, empty/populated states, assistant sheet/panel and forecast screens were opened and inspected at **320, 390, 768 and 1440px**, with a 900px-tall viewport. The inspection uses test-only data and the app’s existing local artwork. It prompted correction of cramped day amounts, an empty Coming Up message above real projections, and intentional no-data copy. A later empty-state scope regression was caught by browser checks and corrected before the final run. No unresolved runtime exceptions or unintended document overflow remain in the recorded checks.

The hero is about 220px tall on phones and 238px on larger widths. The header is centered; the wealth figure remains the largest financial metric; cards preserve the exact order instead of alternating a desktop dashboard grid. Charts retain pointer/touch/keyboard observation and real saved evidence. The assistant is a native modal bottom sheet on phones and right-side panel on larger screens. Dialog fields/actions scroll within the available viewport; keyboard focus stays in the modal and returns to its opening control. Bottom navigation and the floating star clear device safe-area insets.

Animations use a sampled damped-spring easing with compositor transform/opacity, restrained hover movement, and explicit reduced-motion overrides. Frame timing was sampled over 40 animation frames while opening the assistant at 390px and 1440px. An initial run showed stalls with the full-page backdrop blur. Removing that blur (without removing the hero glass) gave a **16.7ms median** at both widths, with **16.8ms and 16.7ms p95** respectively in the isolated follow-up. No runtime errors or document overflow were recorded. The same runtime check saved/reloaded a local profile and notification preference and confirmed the financial-store JSON stayed unchanged. A timing sample on a shared Linux runner is not a guarantee for every physical device or installed browser.

Generated evidence: `qa-output/home-v2-{width}-{populated|empty|focus|assistant|forecast}.png`. Reproducible via the v2 Playwright scenarios and local runtime inspection. Representative inspected artifacts are retained under `docs/home-v2/`. Full-page screenshots show fixed controls at the original viewport bottom, partway through the full-page image; those controls remain fixed during real scrolling.

## Requirement conformance

| Requirement | Implementation | Verification / evidence | Result |
| --- | --- | --- | --- |
| Exact Home narrative and card order | HomeCommandCenter + Daily Focus | v2 heading-order test; four-width rendered screenshots | PASS |
| Centered menu/title/Settings; Accounts/Goals/Investments access | Header, drawer and canonical routes | Drawer regressions, Settings and primary-nav checks | PASS |
| Daily greeting, weekday, full date/year, motivation, focus words | HeroMedia + local clock | Fixed-date/time tests and bright-image inspection | PASS |
| Ambient imagery/video, glass, rounded editorial hero | Existing local media + v2 CSS | Media/persistence/source-coordination tests; actual Home images | PASS |
| Primary Net Worth KPI, signed green/red delta, observed chart | Existing WealthPanel with v2 mode | Negative Net Worth/delta test; range/touch/keyboard regressions | PASS |
| Five history ranges including YTD; context toggles; Add Account below chart | v2 WealthPanel | Exact range list and Jan 1 cutoff; account creation and chart checks | PASS |
| Forecast → cash flow, Net Worth projection and scenarios | Local Forecast component with explicit assumptions | Decimal-precision, scenario totals and no-write assertions; offline check | PASS |
| Seven-day total/grid, selected tile, merchant/date/amount evidence | Local day selection + canonical totals/rows | Refund/transfer/day evidence checks; mobile internal-scroll inspection | PASS |
| Current-month budget, consumed progress, summary and four health states | Canonical budgetSummary + documented presentation thresholds | Healthy/Caution/Risk/Exceeded/Not planned tests and empty state | PASS |
| Coming Up Expense/Income/Savings/Investment with source details | Chronological source/projection list; investment-linked canonical records | Upcoming and investment tests; rendered coming-up rows | PASS |
| Recent Activity all canonical types, categories/accounts/status and detail | Shared vector rows and canonical dialogs/actions | Existing financial/copy/move/refund/recovery cases; new Home tests | PASS |
| Purple persistent AI entry; sheet on mobile/panel on desktop | Assistant + fixed FAB + primary AI item | Four-width layout, modal/focus/Back and single-active-pill tests | PASS |
| Safe assistant UI, adapter, loading/error/unavailable states | Undefined default adapter; cancellable question-only interface | No external request/storage checks and test-only adapter harness | PASS |
| Actual AI trend/budget/goal/savings analysis and forecasting answers | No authorized AI service configured | No generated or simulated advice; no financial data sent | PARTIAL — authorized provider and data-sharing integration required |
| Home / Accounts / Spending / Budget / AI fixed nav and active pill | v2 primary navigation | Ordered five items, selected state and existing route regressions | PASS |
| Dark Home, soft-gradient elevated cards, typography, spacing | Scoped home-v2 CSS | Populated/empty 320/390/768/1440 inspection; saved theme unchanged | PASS |
| Keyboard, semantic controls, contrast, chart alternatives, reduced motion and safe areas | Native controls/dialogs, existing accessible chart; scoped CSS | Focus/trapping/Back/reduced-motion/overflow assertions plus visual checks | PASS |
| Spring motion and 60 FPS target | Sampled damped spring; transform/opacity | Isolated median 16.7ms, p95 16.7–16.8ms at 390/1440px; reduced motion tests | PASS — tested Chromium; physical devices remain UAT |
| Profile and notification preferences in Settings | Separate device-local personal preferences | Local UI and storage; finance schema unchanged | PASS |
| Online profile / delivered push or background notifications | No backend or notification service configured | UI explicitly identifies these services as unavailable | PARTIAL — service integration required |
| Canonical precision/storage/import/recurring/backup/PWA protections | Domain/service-worker source retained | Core/browser/offline suites and protected-ref checks | PASS |
| Understand all key information within five seconds | Clear narrative, primary metric and progressive detail | Layout inspected; no timed human comprehension study performed | PARTIAL — Product Owner usability/UAT judgment |

No implementation is marked accepted, approved, released or production-ready. The service-dependent items above are explicit boundaries, not fabricated working features.

## Candidate delivery and Product Owner UAT

The final commit is identified in the delivery report; candidate publication targets **only** `origin/home-page-design-candidate` after validation. No merge, production deployment, manual workflow trigger, force-push or protected history rewrite is authorized or performed. Production remains at the exact SHA recorded above; `main` remains unchanged.

The Product Owner should inspect that isolated candidate in a separate browser profile, using a copy of any financial backup. Check the financial narrative, large KPI, glass/focus composition, day-tile interaction, budget health, source detail, native Back behavior, AI unavailable states, forecast assumptions and installed/offline behavior. Actual Windows/mobile codecs, device frame pacing, screen-reader experience and the five-second comprehension criterion remain human UAT checks.
