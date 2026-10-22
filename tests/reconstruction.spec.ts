import { test, expect, type Page } from "@playwright/test";
const key = "my-home-finance-financial-core";
const primary = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("button", { name, exact: true });
async function seed(page: Page) {
  await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key)!);
    const cat = s.categories.find((c: any) => c.name === "Groceries");
    s.accounts = [
      {
        id: "bank",
        name: "Checking",
        type: "checking",
        openingBalanceMinor: 500000,
        openingBalanceDate: "2026-01-01",
        archived: false,
        createdAt: "",
        updatedAt: "",
      },
    ];
    s.accounts.push({
      id: "savings",
      name: "Savings",
      type: "savings",
      openingBalanceMinor: 0,
      openingBalanceDate: "2026-01-01",
      archived: false,
      createdAt: "",
      updatedAt: "",
    });
    const paycheck = s.categories.find((c: any) => c.name === "Paycheck");
    const savingsTransfer = s.categories.find(
      (c: any) => c.name === "Savings Transfer",
    );
    const items = [
      ["purchase", "Market purchase", "2026-10-20", "expense", "paid", 10000],
      ["refund", "Market refund", "2026-10-21", "refund", "posted", 2500],
      [
        "pending",
        "Pending purchase",
        "2026-10-21",
        "expense",
        "pending",
        90000,
      ],
      [
        "transfer",
        "Savings transfer",
        "2026-10-21",
        "transfer",
        "posted",
        50000,
      ],
      ["income", "Salary", "2026-10-01", "income", "posted", 200000],
      ["prior", "Prior groceries", "2026-09-20", "expense", "paid", 15000],
      ["old", "Preserved 2025", "2025-12-01", "expense", "paid", 1234],
    ];
    s.transactions = items.map(
      ([id, description, transactionDate, type, status, amountMinor]) => ({
        id,
        description,
        transactionDate,
        type,
        status,
        amountMinor,
        categoryId:
          type === "income"
            ? paycheck.id
            : type === "transfer"
              ? savingsTransfer.id
              : cat.id,
        groupId:
          type === "income"
            ? paycheck.parentId
            : type === "transfer"
              ? savingsTransfer.parentId
              : cat.parentId,
        accountId: "bank",
        destinationAccountId: type === "transfer" ? "savings" : undefined,
        originalTransactionId: type === "refund" ? "purchase" : undefined,
        currency: "USD",
        sourceType: "manual",
        createdAt: "",
        updatedAt: "",
      }),
    );
    s.budgets = [
      {
        id: "b",
        month: "2026-10",
        spendingMinor: 5000,
        plannedIncomeMinor: 250000,
        categoryAmounts: { [cat.id]: 5000 },
      },
    ];
    s.netWorthSnapshots = [
      { id: "n1", date: "2026-09-23", valueMinor: 400000 },
      { id: "n2", date: "2026-10-01", valueMinor: 450000 },
    ];
    s.recurringRules = [
      {
        id: "rent",
        name: "Next rent",
        kind: "expense",
        frequency: "monthly",
        nextDate: "2026-11-01",
        amountMinor: 80000,
        enabled: true,
        status: "pending",
        accountId: "bank",
      },
    ];
    localStorage.setItem(key, JSON.stringify(s));
  }, key);
  await page.reload();
  await expect(page.locator(".bc-dashboard")).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-21T18:00:00"));
  await page.goto("/my-home-finance/");
  await expect(page.locator(".bc-dashboard")).toBeVisible();
  await seed(page);
});

test("hero hierarchy, circular player and viewport reveal financial content", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const hero = page.locator(".bc-hero"),
      player = hero.getByRole("button", { name: "Play sound" });
    await expect(hero.locator("h1")).toHaveText("Wednesday");
    await expect(hero.locator(".bc-hero-date")).toHaveText("October 21 · 2026");
    await expect(hero).not.toContainText("Welcome home.");
    await expect(hero.locator(".bc-motivation")).not.toBeEmpty();
    const h = (await hero.boundingBox())!,
      w = (await page.locator(".bc-wealth-panel").boundingBox())!,
      b = (await player.boundingBox())!;
    expect(h.height).toBeLessThan(250);
    expect(w.y).toBeLessThan(width <= 600 ? 320 : 380);
    expect(b.width).toBe(b.height);
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("bounded picker preserves old records and clamps both navigation boundaries", async ({
  page,
}) => {
  await primary(page, "Spending").click();
  await page.getByRole("button", { name: "Choose reporting period" }).click();
  const d = page.getByRole("dialog", {
      name: "Choose reporting month and year",
    }),
    years = d.getByLabel("Reporting year", { exact: true });
  await expect(years.locator("option")).toHaveText(
    Array.from({ length: 25 }, (_, i) => String(2026 + i)),
  );
  await years.selectOption("2050");
  await d.getByRole("button", { name: "December", exact: true }).click();
  await d.getByRole("button", { name: "Apply period" }).click();
  await expect(
    page.getByRole("button", { name: "Next month", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Next calendar month", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Choose reporting period" }).click();
  await years.selectOption("2026");
  await d.getByRole("button", { name: "January", exact: true }).click();
  await d.getByRole("button", { name: "Apply period" }).click();
  await expect(
    page.getByRole("button", { name: "Previous month", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      (k) =>
        JSON.parse(localStorage.getItem(k)!).transactions.find(
          (t: any) => t.id === "old",
        ).transactionDate,
      key,
    ),
  ).toBe("2025-12-01");
});
test("Overview, breakdown and budget agree on signed canonical spending without writes", async ({
  page,
}) => {
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  await primary(page, "Spending").click();
  await expect(page.locator(".ex-spending-summary .ex-display")).toHaveText(
    "$75.00",
  );
  await expect(page.locator(".ex-delta")).toHaveText(
    "50.0% less than September",
  );
  await page.getByRole("tab", { name: "Breakdown", exact: true }).click();
  await expect(page.locator(".ex-category-row")).toHaveCount(1);
  await expect(page.locator(".ex-category-row")).toContainText("$75.00");
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  await expect(page.locator(".ex-category-row")).toHaveCount(1);
  await expect(page.locator(".ex-category-row")).toContainText("Home");
  await page.getByRole("tab", { name: "Budget", exact: true }).click();
  await expect(page.locator(".ex-budget-numbers")).toContainText(
    "Planned$50.00Spent$75.00Overspent$25.00",
  );
  await expect(page.locator(".ex-allocation")).toContainText(
    "$25.00 overspent",
  );
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
});
test("Home budget drilldown, allocation, filters and detail retain their origin", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Explore your budget" }).click();
  await expect(
    page.getByRole("tab", { name: "Budget", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.locator(".ex-allocation").click();
  await expect(
    page.getByRole("tab", { name: "Transactions", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: /Market purchase/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Transaction Detail" }),
  ).toContainText("$100.00");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByRole("tab", { name: "Transactions", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goBack();
  await expect(
    page.getByRole("tab", { name: "Budget", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goBack();
  await expect(page.locator(".bc-dashboard")).toBeVisible();
});
test("Home day and calendar preserve context through detail and browser Back", async ({
  page,
}) => {
  await page
    .getByRole("button", {
      name: "2026-10-21: -$25.00, previous week $0.00",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Daily Summary · 2026-10-21" }),
  ).toBeVisible();
  await expect(page.locator(".ex-selection-total")).toContainText("-$25.00");
  await page.getByRole("button", { name: /Market refund/ }).click();
  await page.goBack();
  await expect(
    page.getByRole("dialog", { name: "Transaction Detail" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Daily Summary · 2026-10-21" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^2026-10-20, / }).click();
  await expect(page.locator(".ex-selection-total")).toContainText("$100.00");
  await page.getByRole("button", { name: /Market purchase/ }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByRole("button", { name: /^2026-10-20, / }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("workspace filters intersect month and retain all canonical classifications", async ({
  page,
}) => {
  await primary(page, "Spending").click();
  await page.getByRole("tab", { name: "Transactions", exact: true }).click();
  await page
    .getByRole("button", { name: "Search and filters", exact: true })
    .click();
  const d = page.getByRole("dialog", { name: "Transaction filters" });
  await d.getByLabel("From date", { exact: true }).fill("2026-09-01");
  await d.getByLabel("Through date", { exact: true }).fill("2026-10-20");
  await d.getByLabel("Type", { exact: true }).selectOption("expense");
  await d.getByLabel("Status", { exact: true }).selectOption("paid");
  await d.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".ex-transactions .bc-row")).toHaveCount(1);
  await expect(page.locator(".ex-transactions .bc-row")).toContainText(
    "Market purchase",
  );
  await page
    .getByRole("button", { name: "Search and filters", exact: true })
    .click();
  await d.getByRole("button", { name: "Clear filters" }).click();
  await d.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".ex-transactions .bc-row")).toHaveCount(5);
});
for (const theme of ["dark", "light"])
  for (const width of [320, 390, 768, 1440])
    test(`reconstructed ${theme} ${width} visual evidence`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByLabel("Theme", { exact: true }).selectOption(theme);
      await page
        .getByLabel("Home hero image or video")
        .setInputFiles("public/assets/heroes/home/home-01.webp");
      await primary(page, "Home").click();
      await expect(page.locator(".bc-hero img")).toHaveJSProperty(
        "complete",
        true,
      );
      await page.screenshot({
        path: `qa-output/final-${theme}-${width}-home.png`,
        fullPage: true,
      });
      await page
        .locator(".bc-wealth-panel")
        .screenshot({ path: `qa-output/final-${theme}-${width}-wealth.png` });
      await primary(page, "Spending").click();
      for (const tab of ["Overview", "Breakdown", "Budget", "Transactions"]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `qa-output/final-${theme}-${width}-${tab}.png`,
          fullPage: true,
        });
      }
      await page.getByRole("tab", { name: "Overview", exact: true }).click();
      await page.getByRole("button", { name: /^2026-10-20, / }).click();
      await page
        .locator(".ex-calendar-panel")
        .screenshot({ path: `qa-output/final-${theme}-${width}-calendar.png` });
      await page.getByRole("button", { name: /Market purchase/ }).click();
      await page
        .getByRole("dialog", { name: "Transaction Detail" })
        .screenshot({ path: `qa-output/final-${theme}-${width}-detail.png` });
      await page.getByRole("button", { name: "Close dialog" }).click();
      await page
        .getByRole("tab", { name: "Transactions", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Search and filters", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Transaction filters" })
        .screenshot({ path: `qa-output/final-${theme}-${width}-filters.png` });
      expect(errors).toEqual([]);
    });

test("compact media control coordinates sources, keyboard and reduced motion without filenames on Home", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Home hero image or video")
    .setInputFiles("tests/fixtures/rc2-hero.webm");
  await page
    .getByLabel("Local MP3", { exact: true })
    .setInputFiles("tests/fixtures/rc2-ambient.mp3");
  await page
    .getByLabel("Sound source", { exact: true })
    .selectOption("ambient");
  await primary(page, "Home").click();
  const hero = page.locator(".bc-hero");
  await expect(hero).not.toContainText("rc2-hero.webm");
  await expect(hero).not.toContainText("rc2-ambient.mp3");
  const play = hero.getByRole("button", { name: "Play sound", exact: true });
  await play.focus();
  await expect(play).toBeFocused();
  await page.keyboard.press("Enter");
  const pause = hero.getByRole("button", { name: "Pause sound", exact: true });
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((a: HTMLAudioElement) => !a.paused && !a.muted),
    )
    .toBe(true);
  await expect(hero.locator("video")).toHaveJSProperty("muted", true);
  expect(
    await hero
      .locator(".bc-orbit-disc")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("bc-vinyl-spin");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await hero
      .locator(".bc-orbit-disc")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((a: HTMLAudioElement) => !a.paused && !a.muted),
    )
    .toBe(true);
  await pause.click();
  await expect(
    hero.getByRole("button", { name: "Play sound", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("audio")).toHaveJSProperty("muted", true);
});
test("Home recent activity returns to its original Home position", async ({
  page,
}) => {
  await page
    .locator(".bc-activity-panel")
    .getByRole("button", { name: /Market purchase/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Transaction Detail" }),
  ).toContainText("Market purchase");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-workspace", "Home");
  await expect(
    page
      .locator(".bc-activity-panel")
      .getByRole("button", { name: /Market purchase/ }),
  ).toBeFocused();
});
test("Home recent week carries evidence across month boundaries", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-02T12:00:00"));
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    s.recurringRules = [];
    s.transactions = [
      ["oct", "October shopping", "2026-10-30", 6000],
      ["nov", "November shopping", "2026-11-01", 4000],
    ].map(([id, description, transactionDate, amountMinor]) => ({
      id,
      description,
      transactionDate,
      amountMinor,
      type: "expense",
      status: "paid",
      currency: "USD",
      sourceType: "manual",
      createdAt: "",
      updatedAt: "",
    }));
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  await page.reload();
  await page
    .getByRole("button", { name: "Explore spending", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".ex-selection-total")).toContainText("$100.00");
  await expect(page.locator(".ex-evidence-panel")).toContainText(
    "October shopping",
  );
  await expect(page.locator(".ex-evidence-panel")).toContainText(
    "November shopping",
  );
  await expect(
    page.getByRole("button", { name: "Choose reporting period" }),
  ).toContainText("November 2026");
});

test("analysis drilldowns clear unrelated transaction filters and Back cancels draft dates", async ({
  page,
}) => {
  await primary(page, "Spending").click();
  await page.getByRole("tab", { name: "Transactions", exact: true }).click();
  await page
    .getByRole("button", { name: "Search and filters", exact: true })
    .click();
  const filters = page.getByRole("dialog", { name: "Transaction filters" });
  await filters
    .getByLabel("Search", { exact: true })
    .fill("no matching merchant");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".ex-transactions .bc-row")).toHaveCount(0);
  await page.getByRole("tab", { name: "Breakdown", exact: true }).click();
  await page.locator(".ex-category-row").click();
  await expect(page.locator(".ex-transactions .bc-row")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Search and filters", exact: true })
    .click();
  await filters.getByLabel("From date", { exact: true }).fill("2026-10-21");
  await page.goBack();
  await expect(filters).not.toBeVisible();
  await expect(page.locator(".ex-transactions .bc-row")).toHaveCount(3);
  await page.getByRole("button", { name: /Market purchase/ }).click();
  await page.goBack();
  await expect(
    page.getByRole("dialog", { name: "Transaction Detail" }),
  ).not.toBeVisible();
  await expect(page.locator(".ex-transactions .bc-row")).toHaveCount(3);
});
