# Home reference design and category icons

Baseline: `home-01-hero-media-correction` at
`06651804bfa4389718241fbcd2b918ab4e049ed6`.
New candidate: `home-reference-icons-candidate`.

Status: **AWAITING PRODUCT OWNER UAT**.

This implements the Product Owner's subsequent screenshot-led Home rebuild,
including Home cards, navigation and category presentation. The previous HOME-01
scope freeze described the earlier work order; this new request explicitly
expands the visual scope. Financial calculations and the completed HOME-01 media
implementation remain unchanged.

## Changes

- Near-black `#050505` page and flat `#121212` cards, matching the dominant colors
  sampled from the supplied phone screenshots. Blue `#219ef8` selects a spending
  day and colors the budget progress; the chart uses blue `#3299e6`.
- Neutral navigation pills and controls, restrained violet reserved for the AI
  entry points, uppercase spaced card headings, outlined time ranges and Add
  Account, and a compact Net Worth chart. Secondary history actions remain
  available from the header's accessible three-dot disclosure menu.
- Functional Overview / Net worth / Advice shortcuts. Existing Net Worth,
  spending, budget, commitments and activity actions retain their behavior.
- All seven spending dates stay visible at the required widths. Recent
  transactions show the latest four expense/refund records, including older
  activity as in the reference, while the main metric still sums exactly the
  previous seven days. Selecting a day filters its supporting records.
- 71 original vector category glyphs replace generic expense arrows. Groceries use
  a teal basket, transport a coral car, and uncategorized items an amber tag.
  Existing categories receive sensible inferred appearances without rewriting
  their financial data. Every category has a fallback icon.
- Settings → Categories now provides an Icon & color editor for existing
  categories; Add Category provides the same icon grid and eight-color palette.
  Appearance is shared by transaction rows, category selection previews,
  spending breakdowns and budget category allocations.
- Optional `Category.icon` and `Category.color` presentation fields persist with
  existing structured records and exports. Old stores remain compatible. Unknown
  icon/color values use safe allowlisted fallbacks. Editing appearance does not
  change transactions, amounts, accounts, category IDs or hierarchy.
- The local-time greeting, weekday, month/date/year, user image or silent video,
  and compact disc remain at the top. The existing local MP3 upload, privacy,
  persistence, explicit play/pause, no-autoplay and single-audible-source behavior
  are unchanged. No music is bundled or configured by this change.

Reference screenshots were used for visual direction; their third-party branding,
marketing content and account records are not shipped as application content.
Screenshots in this directory use isolated, synthetic UAT records and an explicitly
selected sample image. They do not seed the application or represent user data.

## Validation

- Production type check and Vite production build: PASS.
- Financial Core: 33/33 passed.
- Static checks: 14/14 passed.
- Full browser suite: 125/125 passed, including 8 reference-design tests and the
  existing 11 HOME-01 media tests.
- Production PWA tests: 2/2 passed, including offline navigation, media persistence,
  explicit offline playback and service-worker update/cache behavior. These ran
  against the already-running production preview using a temporary test config;
  the repository's PWA configuration remains unchanged.
- Rendered screenshots physically inspected in Chromium at 320, 390, 768 and
  1440px, including the artwork Hero, card layout, seven-day labels, category
  icons, icon picker, controls and absence of horizontal overflow.
- Focused coverage verifies existing appearance editing, new category creation,
  reload persistence, structured backup metadata, keyboard selection, cancel and
  focus return, unknown legacy metadata fallback, shared expense/category glyphs,
  unchanged financial records, reference colors, and older recent activity with
  a bounded seven-day KPI.
- The existing viewport reveal test was adjusted for the additional functional
  Home shortcut row. Financial assertions were not weakened.

No source changes were made to the financial engine, store, migration, imports,
backup/restore implementation, AI architecture, HeroMedia or useLocalMedia.
Production workflows, base path and PWA files remain unchanged.

## Preview and delivery limitation

The production Vite preview is listening on port 4173 with host exposure enabled:

- `http://localhost:4173/my-home-finance/`
- `http://172.26.91.248:4173/my-home-finance/`
- `http://172.31.11.206:4173/my-home-finance/`

HTTP 200 and browser rendering were verified within this cloud environment.
These private cloud addresses are **not reachable from the Product Owner's
Windows computer or phone** through this session. No public UAT URL was created,
and physical Product Owner UAT is still pending. The candidate branch and these
screenshots provide reviewable source and visual evidence, not completed UAT.

`V-27-Development`, `main`, `home-page-design-candidate` and the completed HOME-01
branch remain unchanged. No merge, production deployment or production workflow
trigger is part of this work.
