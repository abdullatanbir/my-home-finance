# HOME-01 — Hero, music and artwork correction

Starting candidate: `home-page-design-candidate` at
`042a5b60adabd5eafd0fb3a59b6e6852fc5071b6`.
Correction branch: `home-01-hero-media-correction`.

Status: **AWAITING PRODUCT OWNER UAT**. Engineering verification is not Product
Owner acceptance. No merge or production deployment is part of this change.

## Result

- A neutral empty Hero replaces the automatic stock background. Selecting local
  artwork makes it the full-brightness visual; a small localized gradient behind
  the date provides contrast. The screenshots use an explicitly selected sample
  image, not a default or fabricated user selection.
- Device-local greeting, weekday and full date remain understated. Oversized
  focus words and motivational copy have been removed from the Hero only.
- Hero heights are 184px at 320/390px, about 215px at 768px, 240px at 1440px,
  and 156px in short landscape viewports. The record is a 48px touch target.
- Settings offers Add/Change/Remove artwork and Add/Change/Remove music. Local
  MP3/audio uses the existing IndexedDB store. Video artwork is supported silently.
- There is one mounted audio element and one authoritative playback intent.
  Nothing automatically plays music on load, reload, upgrade, file selection,
  replacement or navigation. Leaving Home pauses it. Play is an explicit gesture;
  Pause actually pauses. Media events keep the UI consistent with browser pauses.
- Legacy `hero`, `artwork`, `track` and `sound-source` records are preserved.
  Legacy video-source selection is ignored for sound; a stored track is the only
  music source. With no track, even a legacy video selection stays silent.
  Legacy muted preferences do not trigger playback or get rewritten.
- Source replacement/removal pauses the old audio and revokes its object URL.
  Playback generations prevent stale promises from updating the current state.
  Private local files never enter financial records, backups or external services.
- The record rotates only during playback, pauses with playback, and never
  continuously rotates under reduced motion. Accessible names, pressed state,
  status announcements and a visible keyboard focus ring accompany the control.

## Scope and regression gate

Application changes are restricted to HeroMedia, useLocalMedia, scoped HOME-01
CSS, and the three directly related media connections in BlueprintApp. No
financial, transaction, budget, recurring, backup/restore, import or AI code was
changed. There were no necessary frozen-area exceptions.

Net Worth, Spending, Budget, Coming Up, Recent Activity and bottom navigation
retain their source and styles. Baseline and candidate were rendered at the four
required widths with the same clock and empty financial state. For comparison
only, Hero height was normalized with injected test CSS so the intended Hero
height change could not introduce subpixel shifts in downstream screenshots.
23/24 frozen-section screenshots were pixel-identical. The remaining 768px Net
Worth capture had a maximum channel mean difference of 0.000023 on a 0–255 scale;
its dimensions matched. See `frozen-section-comparison.json`.

Screenshots were visually inspected at 320, 390, 768, 1440px and 844×390 landscape,
including artwork, neutral empty state, Settings, playback and keyboard focus.
No horizontal overflow, greeting/record overlap, clipped controls, blanket image
overlay or excessive mobile Hero height was observed.

## Validation

Commands use the existing dependencies; no dependency or production hosting
configuration changed.

- Production type check — PASS: `tsc --noEmit --incremental false`.
- Production bundle — PASS: `vite build` (same Vite build used by the project script;
  avoids changing the baseline's tracked incremental build cache).
- Financial Core: `npm run test:core` — 33/33 passed.
- Static checks: `npm run qa` — 14/14 passed.
- Browser suite: Playwright, system Chromium — 117/117 passed, including 11/11 focused
  HOME-01 cases. Superseded media labels/source-selection and greeting-case
  expectations were updated; financial assertions were not weakened.
- PWA: `npm run test:pwa` — 2/2 passed, including version-cache activation, offline
  navigation and offline local media persistence/playback without music autoplay.
- Focused coverage includes default silence, legacy compatibility without
  financial mutations, add/reload/replace/remove, URL release, repeated
  play/navigation cycles, one audible element, delayed playback completion,
  document restart, browser pause, keyboard play/pause, reduced motion,
  responsive overlap and local-time date boundaries.
- Final exposed preview smoke checks passed at desktop and mobile widths, with
  successful assets, Home, Settings, navigation, refresh and media controls.
- An initial isolated filter/history timeout passed on rerun; its application
  implementation and test were not modified for HOME-01.

## Cloud preview and physical UAT limitation

The final production build is served with:
`npm run preview -- --host 0.0.0.0 --port 4173 --strictPort`.
The runtime reported:

- Local: `http://localhost:4173/my-home-finance/`
- Network: `http://172.26.91.248:4173/my-home-finance/`
- Network: `http://172.31.11.206:4173/my-home-finance/`

These are addresses inside the isolated cloud environment. They are **not
reachable from the Product Owner's Windows computer or phone** through this
session. They are not a public preview or completed physical-device UAT. The
isolated branch is published for later UAT using the same committed source.
Production and the baseline candidate branch remain untouched.
