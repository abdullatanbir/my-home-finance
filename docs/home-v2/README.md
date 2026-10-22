# Home v2 rendered evidence

These are actual Chromium captures with explicit test-only data, not user records. Home is dark even when a saved light preference remains available for other workspaces.

- `home-v2-320-populated.png`, `home-v2-390-populated.png`, `home-v2-1440-populated.png`: full ordered Home with a negative Net Worth, signed delta, refund day, Caution budget and genuine canonical source/projection rows from the fixture.
- `home-v2-768-empty.png`: intentional empty financial history, no budget and no upcoming/activity records.
- `home-v2-390-focus.png`: editorial glass/image hero with weekday, full date and focus words.
- `home-v2-390-assistant.png`, `home-v2-1440-assistant.png`: mobile native bottom sheet and desktop right-side panel. Default AI is explicitly not connected. The final assistant backdrop is dimmed without full-page blur to avoid animation stalls.
- `home-v2-390-forecast.png`, `home-v2-1440-forecast.png`: local cash-flow/Net Worth scenarios with editable assumptions and no financial writes.

The generated suite also captures 320/390/768/1440px, empty and populated Home states, and assistant/forecast surfaces under ignored `qa-output/`. Reproduce Home captures with `npm run test:e2e -- tests/home-design.spec.ts`.

Full-page screenshots include fixed bottom navigation at the original viewport's bottom, partway through the full-page image. Day tiles scroll within their own card on narrow screens to keep monetary values readable. Native dialog content scrolls within the viewport when necessary.

See [v2 acceptance and limits](../../HOME_DESIGN_V2_ACCEPTANCE.md). Final Product Owner acceptance remains required.
