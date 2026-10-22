import {CategoryIcon,categoryAppearance,categoryColors} from '../categories/CategoryIcon';
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Plus, SlidersHorizontal } from "lucide-react";
import {
  money,
  today,
  type FinancialStore,
  type Transaction,
} from "../../core/model";
import { actual, budgetSummary, comparison, totals } from "../../core/engine";
import SpendingActivity, { type ActivityScale } from "../rc3/SpendingActivity";
import SpendingCalendar from "./SpendingCalendar";
import SpendingTabs from "../rc3/SpendingTabs";

type Props = {
  store: FinancialStore;
  period: string;
  tab: string;
  day: string;
  scale: ActivityScale;
  rows: Transaction[];
  rangeStart: string;
  rangeEnd: string;
  onTab: (tab: string) => void;
  onDay: (day: string) => void;
  onScale: (scale: ActivityScale) => void;
  onRange: (start: string, end: string) => void;
  onPeriod: (period: string) => void;
  onCategory: (id: string, group: boolean) => void;
  onSearch: (search: string) => void;
  onFilters: () => void;
  onAdd: () => void;
  onBudget: () => void;
  transactions: (items: Transaction[]) => ReactNode;
};
export default function SpendingWorkspace(p: Props) {
  const { store, period, tab, day, rows } = p;
  const [grouping, setGrouping] = useState<"category" | "group">("category");
  const start = `${period}-01`,
    end = `${period}-31`,
    sum = totals(store.transactions, start, end),
    budget = budgetSummary(store, period);
  const prev = new Date(`${period}-01T12:00:00`);
  prev.setMonth(prev.getMonth() - 1);
  const prior = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
    priorValue = totals(
      store.transactions,
      `${prior}-01`,
      `${prior}-31`,
    ).spending,
    delta = comparison(sum.spending, priorValue);
  const monthItems = store.transactions.filter(
    (t) => t.transactionDate.startsWith(period) && actual(t),
  );
  const spendingItems = monthItems.filter(
    (t) => t.type === "expense" || t.type === "refund",
  );
  // Partition each transaction once. Group and category views are never added together.
  const buckets = new Map<string, Transaction[]>();
  spendingItems.forEach((t) => {
    const id =
      (grouping === "group"
        ? t.groupId ||
          store.categories.find((c) => c.id === t.categoryId)?.parentId
        : t.categoryId) || "";
    buckets.set(id, [...(buckets.get(id) || []), t]);
  });
  const categories = [...buckets]
    .map(([id, items]) => ({
      id,
      items,
      name: store.categories.find((c) => c.id === id)?.name || "Uncategorized",
      value: totals(items, start, end).spending,
    }))
    .sort((a, b) => b.value - a.value);
  const maximum = Math.max(1, ...categories.map((c) => Math.abs(c.value)));
  const largest = spendingItems
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amountMinor - a.amountMinor)
    .slice(0, 4);
  const frequent = Object.entries(
    spendingItems
      .filter((t) => t.type === "expense")
      .reduce<Record<string, number>>((out, t) => {
        const key = t.merchant || t.description;
        out[key] = (out[key] || 0) + 1;
        return out;
      }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const allocations = Object.entries(
    store.budgets.find((b) => b.month === period)?.categoryAmounts || {},
  ).filter(([, n]) => n > 0);
  const inspect = (a: string, b: string) => {
    p.onRange(a, b);
    p.onDay(a === b ? a : "");
  };
  const evidence = (
    day
      ? store.transactions.filter((t) => t.transactionDate === day)
      : p.rangeStart
        ? store.transactions.filter(
            (t) => actual(t) && (t.type === "expense" || t.type === "refund"),
          )
        : spendingItems
  )
    .filter(
      (t) =>
        (!day || t.transactionDate === day) &&
        (!p.rangeStart || t.transactionDate >= p.rangeStart) &&
        (!p.rangeEnd || t.transactionDate <= p.rangeEnd),
    )
    .sort(
      (a, b) =>
        b.transactionDate.localeCompare(a.transactionDate) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <div className="ex-spending">
      <div className="ex-workspace-intro">
        <p>Understand your everyday money.</p>
        <button className="bc-primary" onClick={p.onAdd}>
          <Plus size={16} /> Add Expense
        </button>
      </div>
      <SpendingTabs value={tab} onChange={p.onTab} />
      <section
        role="tabpanel"
        id="spending-panel"
        aria-labelledby={`spending-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "Overview" && (
          <>
            <div className="ex-overview-grid">
              <section className="bc-card ex-spending-summary">
                <p className="bc-eyebrow">THIS MONTH · ACTUAL SPENDING</p>
                <h2>Total spent</h2>
                <strong className="ex-display">{money(sum.spending)}</strong>
                <p className="ex-delta">
                  {delta === null
                    ? "No previous-month spending to compare"
                    : `${Math.abs(delta).toFixed(1)}% ${delta > 0 ? "more" : delta < 0 ? "less" : "change"} than ${prev.toLocaleDateString("en-US", { month: "long" })}`}
                </p>
                <div className="ex-summary-foot">
                  <span>
                    Previous month<strong>{money(priorValue)}</strong>
                  </span>
                  <span>
                    Actual income<strong>{money(sum.income)}</strong>
                  </span>
                </div>
              </section>
              <section className="bc-card ex-chart-panel">
                <div className="bc-section-head">
                  <div>
                    <p className="bc-eyebrow">THE RHYTHM OF YOUR MONTH</p>
                    <h2>Spending activity</h2>
                  </div>
                </div>
                <SpendingActivity
                  transactions={store.transactions}
                  period={period}
                  scale={p.scale}
                  onScale={p.onScale}
                  onInspect={inspect}
                />
              </section>
            </div>
            <div className="ex-analysis-grid">
              <SpendingCalendar
                inlineEvidence={false}
                store={store}
                period={period}
                day={day}
                onDay={(d) => {
                  p.onDay(d);
                  p.onRange("", "");
                }}
                onPeriod={p.onPeriod}
                transactions={p.transactions}
              />
              <section className="bc-card ex-evidence-panel">
                <p className="bc-eyebrow">THE EVIDENCE</p>
                <h2>
                  {day
                    ? `Spending on ${day}`
                    : p.rangeStart
                      ? `${p.rangeStart} – ${p.rangeEnd}`
                      : "Latest spending"}
                </h2>
                {(day || p.rangeStart) && (
                  <button
                    onClick={() => {
                      p.onDay("");
                      p.onRange("", "");
                    }}
                  >
                    Clear selected dates
                  </button>
                )}
                {(day || p.rangeStart) && (
                  <p className="ex-selection-total">
                    Selected spending{" "}
                    <strong>
                      {money(
                        totals(evidence, p.rangeStart || day, p.rangeEnd || day)
                          .spending,
                      )}
                    </strong>
                  </p>
                )}
                {p.transactions(evidence.slice(0, 8))}
                <button
                  className="bc-text-button"
                  onClick={() => p.onTab("Transactions")}
                >
                  Explore transactions <ArrowUpRight size={16} />
                </button>
                <p className="bc-help">
                  Posted and paid expenses, less refunds. Transfers and savings
                  allocations stay outside spending.
                </p>
              </section>
            </div>
          </>
        )}
        {tab === "Breakdown" && (
          <>
            <div className="ex-section-title">
              <div>
                <p className="bc-eyebrow">FOLLOW THE MONEY</p>
                <h2>Where your money went</h2>
              </div>
              <div
                role="group"
                aria-label="Breakdown grouping"
                className="bc-activity-scale"
              >
                {(["category", "group"] as const).map((g) => (
                  <button
                    key={g}
                    aria-pressed={grouping === g}
                    onClick={() => setGrouping(g)}
                  >
                    {g === "category" ? "Categories" : "Groups"}
                  </button>
                ))}
              </div>
            </div>
            <div className="ex-breakdown-grid">
              <section className="bc-card">
                <p className="bc-eyebrow">NET SPENDING</p>
                <strong className="ex-display">{money(sum.spending)}</strong>
                <div
                  className="ex-category-composition"
                  aria-label="Category spending composition"
                >
                  {categories
                    .filter((c) => c.value > 0)
                    .map((c) => (
                      <span
                        title={`${c.name}: ${money(c.value)}`}
                        key={c.id}
                        style={{
                          flex: c.value,
                          background: categoryColors[categoryAppearance(store.categories.find(x=>x.id===c.id)).color],
                        }}
                      />
                    ))}
                </div>
                {categories.map((c) => (
                  <button
                    className="ex-category-row"
                    key={c.id}
                    onClick={() => p.onCategory(c.id, grouping === "group")}
                  >
                    <CategoryIcon category={store.categories.find(x=>x.id===c.id)} name={c.name}/>
                    <span>
                      <strong>{c.name}</strong>
                      <small>{c.items.length} supporting transactions</small>
                      <span className="ex-category-track">
                        <span
                          style={{
                            width: `${(Math.abs(c.value) / maximum) * 100}%`,
                            background: categoryColors[categoryAppearance(store.categories.find(x=>x.id===c.id)).color],
                          }}
                        />
                      </span>
                    </span>
                    <strong>{money(c.value)}</strong>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
                {!categories.length && (
                  <p>
                    No actual spending in this month. Add an expense to start
                    your picture.
                  </p>
                )}
              </section>
              <div>
                <section className="bc-card">
                  <p className="bc-eyebrow">BIGGEST CONTRIBUTORS</p>
                  <h2>Largest transactions</h2>
                  {p.transactions(largest)}
                </section>
                <section className="bc-card">
                  <p className="bc-eyebrow">EVERYDAY PATTERNS</p>
                  <h2>Frequent expenses</h2>
                  {frequent.map(([name, count]) => (
                    <button
                      className="bc-simple-row"
                      key={name}
                      onClick={() => p.onSearch(name)}
                    >
                      <span>
                        {name}
                        <small>{count} transactions</small>
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                  {!frequent.length && <p>No expense patterns yet.</p>}
                </section>
              </div>
            </div>
          </>
        )}
        {tab === "Budget" && (
          <>
            <section className="bc-card ex-budget-summary">
              <div className="bc-section-head">
                <div>
                  <p className="bc-eyebrow">A PLAN FOR YOUR MONTH</p>
                  <h2>Monthly budget status</h2>
                </div>
                <button onClick={p.onBudget}>Configure Budget</button>
              </div>
              <div className="ex-budget-numbers">
                <span>
                  Planned<strong>{money(budget.budgeted)}</strong>
                </span>
                <span>
                  Spent<strong>{money(budget.spending)}</strong>
                </span>
                <span
                  className={
                    budget.remaining < 0 ? "bc-negative" : "bc-positive"
                  }
                >
                  {budget.remaining < 0 ? "Overspent" : "Remaining"}
                  <strong>{money(Math.abs(budget.remaining))}</strong>
                </span>
              </div>
              <progress
                aria-label="Budget actual spending progress"
                value={Math.max(0, budget.spending)}
                max={Math.max(1, budget.budgeted)}
              />
              <p>
                {budget.budgeted === 0
                  ? "Set a spending plan to see your progress."
                  : budget.remaining < 0
                    ? "Spending exceeds your plan. Review the evidence below."
                    : "You have room in your plan."}
              </p>
              <div className="ex-summary-foot">
                <span>
                  Known upcoming<strong>{money(budget.scheduled)}</strong>
                </span>
                <span>
                  {budget.projectedRemaining < 0
                    ? "Projected overspend"
                    : "Projected remaining"}
                  <strong>{money(Math.abs(budget.projectedRemaining))}</strong>
                </span>
                <span>
                  Income · actual / planned
                  <strong>
                    {money(sum.income)} /{" "}
                    {money(
                      store.budgets.find((b) => b.month === period)
                        ?.plannedIncomeMinor || 0,
                    )}
                  </strong>
                </span>
              </div>
            </section>
            <div className="ex-analysis-grid">
              <section className="bc-card">
                <p className="bc-eyebrow">MAKE YOUR PLAN SPECIFIC</p>
                <h2>Category allocations</h2>
                {allocations.map(([id, planned]) => {
                  const spent = totals(
                    spendingItems.filter(
                      (t) => t.categoryId === id || t.groupId === id,
                    ),
                    start,
                    end,
                  ).spending;
                  return (
                    <button
                      className="ex-allocation"
                      key={id}
                      onClick={() =>
                        p.onCategory(
                          id,
                          store.categories.find((c) => c.id === id)?.level ===
                            "group",
                        )
                      }
                    >
                      <span>
                        <CategoryIcon category={store.categories.find((c)=>c.id===id)}/>
                        {store.categories.find((c) => c.id === id)?.name ||
                          "Uncategorized"}
                        <strong>
                          {money(spent)} / {money(planned)}
                        </strong>
                      </span>
                      <progress value={Math.max(0, spent)} max={planned} />
                      <small className={spent > planned ? "bc-negative" : ""}>
                        {money(Math.abs(planned - spent))}{" "}
                        {spent > planned ? "overspent" : "remaining"}
                      </small>
                    </button>
                  );
                })}
                {!allocations.length && (
                  <p>
                    No category allocations yet. Configure your budget to give
                    each category a plan.
                  </p>
                )}
              </section>
              <section className="bc-card">
                <p className="bc-eyebrow">BEHIND YOUR BUDGET</p>
                <h2>Spending evidence</h2>
                {p.transactions(
                  spendingItems
                    .slice()
                    .sort((a, b) =>
                      b.transactionDate.localeCompare(a.transactionDate),
                    )
                    .slice(0, 6),
                )}
                <button onClick={() => p.onTab("Transactions")}>
                  See all transactions
                </button>
              </section>
            </div>
          </>
        )}
        {tab === "Transactions" && (
          <section className="bc-card ex-transactions">
            <div className="bc-section-head">
              <div>
                <p className="bc-eyebrow">EXPLORE YOUR ACTIVITY</p>
                <h2>Transactions</h2>
                <p>
                  {rows.length} matching records · {period}
                  {day ? ` · ${day}` : ""}
                </p>
              </div>
              <button onClick={p.onFilters}>
                <SlidersHorizontal size={16} /> Search and filters
              </button>
            </div>
            {p.transactions(rows)}
          </section>
        )}
      </section>
    </div>
  );
}
