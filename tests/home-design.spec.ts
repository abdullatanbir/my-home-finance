import { test, expect, type Page } from "@playwright/test";
const key = "my-home-finance-financial-core";
async function seed(page: Page) {
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    const cat = s.categories.find((c: any) => c.name === "Groceries");
    s.preferences.theme = "light";
    s.accounts = [
      ["bank", "Everyday account", "checking", 100000],
      ["savings", "Emergency savings", "savings", 0],
      ["card", "Travel card", "credit_card", 200000],
    ].map(([id, name, type, openingBalanceMinor]) => ({
      id,
      name,
      type,
      openingBalanceMinor,
      openingBalanceDate: "2026-01-01",
      archived: false,
      createdAt: "",
      updatedAt: "",
    }));
    s.transactions = [
      ["e", "Market groceries", "2026-10-20", "expense", "paid", 10000],
      ["r", "Returned groceries", "2026-10-22", "refund", "posted", 2000],
      ["p", "Upcoming home bill", "2026-11-02", "expense", "scheduled", 30000],
      [
        "t",
        "Owned savings transfer",
        "2026-10-21",
        "transfer",
        "posted",
        50000,
      ],
    ].map(([id, description, transactionDate, type, status, amountMinor]) => ({
      id,
      description,
      transactionDate,
      type,
      status,
      amountMinor,
      accountId: "bank",
      destinationAccountId: type === "transfer" ? "savings" : undefined,
      categoryId: type === "transfer" ? undefined : cat.id,
      groupId: type === "transfer" ? undefined : cat.parentId,
      currency: "USD",
      sourceType: "manual",
      createdAt: "",
      updatedAt: "",
    }));
    s.budgets = [
      {
        id: "b",
        month: "2026-10",
        spendingMinor: 10000,
        plannedIncomeMinor: 0,
        categoryAmounts: {},
      },
    ];
    s.netWorthSnapshots = [
      { id: "a", date: "2026-09-23", valueMinor: -100000 },
    ];
    s.recurringRules = [
      ["income", "Monthly salary", "income", 420000, "2026-11-05"],
      ["saving", "Emergency contribution", "savings", 30000, "2026-11-06"],
    ].map(([id, name, kind, amountMinor, nextDate]) => ({
      id,
      name,
      kind,
      amountMinor,
      nextDate,
      frequency: "monthly",
      enabled: true,
      status: "pending",
      accountId: "bank",
    }));
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  await page.reload();
  await expect(page.locator(".hv2-dashboard")).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-22T18:00:00"));
  await page.goto("/my-home-finance/");
  await expect(page.locator(".hv2-dashboard")).toBeVisible();
  await seed(page);
});
test("v2 narrative, KPI mapping, five ranges and dark-only Home preserve domain and theme", async ({
  page,
}) => {
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  await expect(
    page.locator(".hv2-dashboard").getByRole("heading", { level: 2 }),
  ).toHaveText([
    "NET WORTH",
    "SPENT LAST 7 DAYS",
    "BUDGET IN OCTOBER",
    "Coming Up",
    "Recent Activity",
  ]);
  await expect(page.locator(".bc-wealth-number>strong")).toHaveText(
    "-$1,080.00",
  );
  await expect(page.locator(".bc-wealth-number>span")).toContainText(
    "-$80.00 (-8.00%)",
  );
  await expect(page.locator(".hv2-spending>.hv2-metric")).toHaveText("$80.00");
  await expect(page.locator(".hv2-budget>.hv2-metric")).toHaveText("$20.00");
  await expect(page.locator(".hv2-health")).toHaveText("Caution");
  await expect(
    page.locator(".bc-range-control").getByRole("button"),
  ).toHaveText(["1W", "1M", "3M", "YTD", "ALL"]);
  await page.getByRole("button", { name: "YTD", exact: true }).click();
  await expect(page.locator(".bc-period-context")).toContainText("2026-01-01");
  await expect(page.locator("html")).toHaveAttribute("data-bc-theme", "dark");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-bc-theme", "light");
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
});
for (const [planned, status] of [
  [20000, "Healthy"],
  [10000, "Caution"],
  [8500, "Risk"],
  [5000, "Exceeded"],
  [0, "Not planned"],
] as const)
  test(`budget health ${status}`, async ({ page }) => {
    await page.evaluate(
      ({ k, planned }) => {
        const s = JSON.parse(localStorage.getItem(k)!);
        s.budgets[0].spendingMinor = planned;
        localStorage.setItem(k, JSON.stringify(s));
      },
      { k: key, planned },
    );
    await page.reload();
    await expect(page.locator(".hv2-health")).toHaveText(status);
    await expect(page.locator(".hv2-budget")).toContainText("Spent $80.00");
  });
test("spending day selection, canonical detail and coming-up sources", async ({
  page,
}) => {
  await page
    .locator(".hv2-days")
    .getByRole("button", { name: /2026-10-20:/ })
    .click();
  await expect(
    page.locator(".hv2-days").getByRole("button", { name: /2026-10-20:/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".hv2-spending .bc-row")).toHaveCount(1);
  await page.locator(".hv2-spending .bc-row").click();
  await expect(
    page.getByRole("dialog", { name: "Transaction Detail" }),
  ).toContainText("Market groceries");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.locator(".hv2-days").getByRole("button", { name: /2026-10-20:/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".hv2-coming")).toContainText("Upcoming home bill");
  await expect(page.locator(".hv2-coming")).toContainText("Monthly salary");
  await expect(page.locator(".hv2-coming")).toContainText(
    "Emergency contribution",
  );
  await page
    .locator(".hv2-coming")
    .getByRole("button", { name: /^Nov 5 Monthly salary/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Recurring details" }),
  ).toContainText("$4,200.00");
});
test("local forecast uses integer cents and explicit assumptions without writes", async ({
  page,
}) => {
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.getByRole("button", { name: "Forecast", exact: true }).click();
  await page.getByLabel("Monthly income assumption").fill("100.25");
  await page.getByLabel("Monthly spending assumption").fill("50.10");
  await page.getByLabel("Scenario horizon").selectOption("3");
  await expect(page.locator(".hv2-scenario-metrics")).toContainText("$50.15");
  await expect(page.locator(".hv2-scenario-metrics")).toContainText("-$929.55");
  await expect(page.locator(".hv2-scenario-table tbody tr")).toHaveCount(3);
  await page.getByLabel("Monthly income assumption").fill("100.255");
  await expect(page.getByRole("alert")).toContainText(
    "at most two decimal places",
  );
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
});
test("assistant keeps questions local, supports Back and has one active navigation pill", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://localhost:5173") &&
      !r.url().startsWith("http://127.0.0.1:5173") &&
      !r.url().startsWith("blob:")
    )
      requests.push(r.url());
  });
  const fab = page.getByRole("button", { name: "Open financial copilot" });
  await fab.click();
  const d = page.getByRole("dialog", { name: "Financial copilot" });
  await expect(d).toContainText("AI not connected");
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("button", { name: "AI", exact: true });
  await expect(page.locator(".hv2-bottom [aria-current=page]")).toHaveCount(1);
  await d.getByRole("button", { name: "Am I staying on budget?" }).click();
  await d.getByRole("button", { name: "Ask copilot" }).click();
  await expect(d.getByRole("status")).toContainText("unavailable");
  await page.goBack();
  await expect(d).not.toBeVisible();
  await expect(fab).toBeFocused();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Am I staying on budget?",
  );
});
test("adapter contract exposes loading, error, retry and actual adapter answer states", async ({
  page,
}) => {
  await page.goto("/my-home-finance/tests/fixtures/assistant-harness.html");
  await page.evaluate(() => {
    (window as any).renderAssistant("configured");
  });
  const d = page.getByRole("dialog", { name: "Financial copilot" });
  await d.getByLabel("Your question").fill("A test-only question");
  await d.getByRole("button", { name: "Ask copilot" }).click();
  await expect(d.getByRole("status")).toContainText("Waiting");
  await page.evaluate(() => (window as any).fail());
  await expect(d.getByRole("alert")).toContainText("could not respond");
  await d.getByRole("button", { name: "Try again" }).click();
  await page.evaluate(() =>
    (window as any).complete({ answer: "Test adapter response only" }),
  );
  await expect(
    d.getByRole("region", { name: "Provider response" }),
  ).toContainText("Test adapter response only");
  expect(await page.evaluate(() => (window as any).lastQuestion)).toBe(
    "A test-only question",
  );
});
for (const width of [320, 390, 768, 1440])
  for (const empty of [false, true])
    test(`Home v2 ${width} ${empty ? "empty" : "populated"} rendered inspection`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      if (empty) {
        await page.evaluate((k) => {
          const s = JSON.parse(localStorage.getItem(k)!);
          for (const f of [
            "accounts",
            "transactions",
            "budgets",
            "recurringRules",
            "netWorthSnapshots",
            "investments",
            "goals",
            "contributions",
          ])
            s[f] = [];
          localStorage.setItem(k, JSON.stringify(s));
        }, key);
        await page.reload();
      }
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page
        .getByLabel("Home hero image or video")
        .setInputFiles("public/assets/heroes/home/home-01.webp");
      await page
        .getByRole("navigation", { name: "Primary" })
        .getByRole("button", { name: "Home", exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator(".bc-hero h1")).toHaveText("Thursday");
      await expect(page.locator(".bc-hero-date")).toHaveText(
        "October 22, 2026",
      );
      await expect(page.locator(".hv2-focus-words")).toContainText("focus");
      await expect(page.locator(".hv2-bottom").getByRole("button")).toHaveText([
        "Home",
        "Accounts",
        "Spending",
        "Budget",
        "AI",
      ]);
      await page.screenshot({
        animations: "disabled",
        path: `qa-output/home-v2-${width}-${empty ? "empty" : "populated"}.png`,
        fullPage: true,
      });
      await page.locator(".bc-hero").screenshot({
        animations: "disabled",
        path: `qa-output/home-v2-${width}-focus.png`,
      });
      await page
        .getByRole("button", { name: "Open financial copilot" })
        .click();
      const d = page.getByRole("dialog", { name: "Financial copilot" });
      const box = (await d.boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(width);
      if (width <= 600) {
        expect(box.width).toBe(width);
        expect(box.x).toBe(0);
        expect(box.y).toBeGreaterThan(80);
      } else expect(box.x).toBeGreaterThan(width / 3);
      await page.screenshot({
        animations: "disabled",
        path: `qa-output/home-v2-${width}-assistant.png`,
      });
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() => !!document.activeElement?.closest("dialog")),
      ).toBe(true);
      await page.keyboard.press("Escape");
      await expect(d).not.toBeVisible();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page
        .getByRole("button", { name: "Open financial copilot" })
        .click();
      expect(await d.evaluate((e) => getComputedStyle(e).animationName)).toBe(
        "none",
      );
    });

test("scheduled investment commitments display without creating actual spending or valuations", async ({
  page,
}) => {
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    s.accounts.push({
      id: "investment-account",
      name: "Manual fund",
      type: "other_asset",
      openingBalanceMinor: 0,
      openingBalanceDate: "2026-01-01",
      archived: false,
      createdAt: "",
      updatedAt: "",
    });
    s.investments = [
      {
        id: "fund",
        name: "Manual fund",
        type: "fund",
        investedMinor: 0,
        accountId: "investment-account",
        valuations: [],
      },
    ];
    s.transactions.push({
      id: "future-fund",
      description: "Planned fund contribution",
      type: "transfer",
      status: "scheduled",
      transactionDate: "2026-11-03",
      amountMinor: 25000,
      currency: "USD",
      accountId: "bank",
      destinationAccountId: "investment-account",
      investmentId: "fund",
      sourceType: "manual",
      createdAt: "",
      updatedAt: "",
    });
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  await page.reload();
  await expect(page.locator(".hv2-coming")).toContainText(
    "Planned fund contribution",
  );
  await expect(page.locator(".hv2-coming")).toContainText("Investment");
  await expect(page.locator(".hv2-spending>.hv2-metric")).toHaveText("$80.00");
  await expect(page.locator(".bc-wealth-number>strong")).toHaveText(
    "-$1,080.00",
  );
});
