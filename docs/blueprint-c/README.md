# Rendered reconstruction evidence

These Chromium screenshots contain deterministic **test-only** financial data from `tests/reconstruction.spec.ts`; they are not user records. Images were opened and inspected during implementation, including the final contrast and mobile-spacing corrections.

- `final-dark-390-home.png`, `final-light-390-home.png`, `final-dark-1440-home.png`: compact hero, financial position, spending, overspent budget, upcoming and recent activity.
- `final-dark-1440-Overview.png`, `final-dark-320-Overview.png`: monthly summary, weekly chart, analysis calendar and underlying evidence.
- `final-light-768-Breakdown.png`: category composition, contributors and expense frequency.
- `final-light-390-Budget.png`: planned/spent/overspent, forecast, category allocations and supporting transactions.
- `final-dark-320-Transactions.png`: canonical activity with workspace-native search/filter access.
- `final-dark-390-calendar.png`: selected date, today and refund indication.
- `final-dark-390-detail.png`, `final-light-390-filters.png`: native scrollable dialogs. The screenshot clips to each dialog's viewport; additional actions/fields remain accessible by scrolling.

Full generated evidence for 320/390/768/1440px and both themes remains in ignored `qa-output/` and is reproducible with `npm run test:e2e -- tests/reconstruction.spec.ts`.

The primary navigation is fixed to the viewport bottom. A full-page capture therefore shows it partway through the page image, at the bottom of the original capture viewport.

See [the acceptance record](../../HOME_SPENDING_ACCEPTANCE.md) for traceability, exact checks and Product Owner UAT limitations.
