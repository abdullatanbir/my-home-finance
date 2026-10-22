import { useState, useEffect, useRef, type ReactNode } from "react";
import { ArrowUpRight, ArrowRight, Plus } from "lucide-react";
import {
  today,
  money,
  type FinancialStore,
  type Transaction,
} from "../../core/model";
import { totals, budgetSummary, occurrences } from "../../core/engine";
import { WealthPanel } from "../rc2/Dashboard";
export type HomeProps = {
  store: FinancialStore;
  onNavigate: (view: string, tab?: string) => void;
  onDay: (date: string) => void;
  onSnapshot: () => void;
  onAddAccount: () => void;
  onRecurring: (id: string) => void;
  transactions: (items: Transaction[]) => ReactNode;
  onQuick: () => void;
  onAssistant: () => void;
};
export default function HomeCommandCenter(p: HomeProps) {
  const [clockDay, setClockDay] = useState(today);
  useEffect(() => {
    const timer = setInterval(() => setClockDay(today()), 60000);
    return () => clearInterval(timer);
  }, []);
  const { store } = p,
    month = clockDay.slice(0, 7),
    budget = budgetSummary(store, month);
  const [selectedDay, setSelectedDay] = useState(today());
  const [inspectingDay, setInspectingDay] = useState(false);
  const daysRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (daysRef.current)
      daysRef.current.scrollLeft =
        daysRef.current.scrollWidth - daysRef.current.clientWidth;
  }, []);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today()}T12:00:00`);
    d.setDate(d.getDate() - 6 + i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    d.setDate(d.getDate() - 7);
    const prior = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      date,
      name: new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      value: totals(store.transactions, date, date).spending,
      previous: totals(store.transactions, prior, prior).spending,
    };
  });
  const weekTotal = days.reduce((n, d) => n + d.value, 0),
    ratio = budget.budgeted > 0 ? budget.spending / budget.budgeted : null;
  const health =
    ratio === null
      ? "Not planned"
      : ratio > 1
        ? "Exceeded"
        : ratio >= 0.9
          ? "Risk"
          : ratio >= 0.75
            ? "Caution"
            : "Healthy";
  const upcoming = store.transactions
    .filter((t) => ["scheduled", "pending"].includes(t.status))
    .sort((a, b) =>
      (a.dueDate || a.transactionDate).localeCompare(
        b.dueDate || b.transactionDate,
      ),
    )
    .slice(0, 3);
  const projected = occurrences(
    store,
    today(),
    `${Number(today().slice(0, 4)) + 1}-12-31`,
  )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const events = [
    ...upcoming.map((item) => ({
      kind: "transaction" as const,
      id: item.id,
      date: item.dueDate || item.transactionDate,
      item,
    })),
    ...projected.map((item) => ({
      kind: "projection" as const,
      id: item.id,
      date: item.date,
      item,
    })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const dayRows = store.transactions
    .filter(
      (t) =>
        (inspectingDay
          ? t.transactionDate === selectedDay
          : t.transactionDate >= days[0].date &&
            t.transactionDate <= today()) &&
        ["expense", "refund"].includes(t.type),
    )
    .sort(
      (a, b) =>
        b.transactionDate.localeCompare(a.transactionDate) ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 4);
  const recent = [...store.transactions]
    .filter((t) => t.transactionDate <= today())
    .sort(
      (a, b) =>
        b.transactionDate.localeCompare(a.transactionDate) ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 6);
  return (
    <div className="bc-dashboard hv2-dashboard">
      <WealthPanel
        store={store}
        onOpen={() => p.onNavigate("Net Worth")}
        onSnapshot={p.onSnapshot}
        onAddAccount={p.onAddAccount}
        designV2
        onForecast={() => p.onNavigate("Forecast")}
      />
      <section className="bc-card hv2-spending bc-spend-panel">
        <div className="bc-section-head">
          <h2>SPENT LAST 7 DAYS</h2>
          <button
            aria-label="Open Spending"
            className="bc-text-button"
            onClick={() => p.onNavigate("Spending")}
          >
            <ArrowUpRight size={19} />
          </button>
        </div>
        <strong className="hv2-metric">{money(weekTotal)}</strong>
        <p className="hv2-caption">Your everyday spending, less refunds.</p>
        <div
          ref={daysRef}
          className="hv2-days"
          role="group"
          aria-label="Daily spending"
        >
          {days.map((d) => (
            <button
              key={d.date}
              aria-pressed={selectedDay === d.date}
              aria-label={`${d.date}: ${money(d.value)}, previous week ${money(d.previous)}`}
              onClick={() => {
                setSelectedDay(d.date);
                setInspectingDay(true);
              }}
            >
              <span>{d.name}</span>
              <strong className={d.value < 0 ? "bc-positive" : ""}>
                {money(d.value)}
              </strong>
              <small>{Number(d.date.slice(-2))}</small>
            </button>
          ))}
        </div>
        <div className="hv2-evidence-head">
          <span>
            {!inspectingDay
              ? "Recent"
              : selectedDay === today()
                ? "Today"
                : new Date(`${selectedDay}T12:00:00`).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  )}{" "}
            · Spending activity
          </span>
          <button
            className="bc-text-button"
            aria-label="Open selected day in Spending"
            onClick={() => p.onDay(selectedDay)}
          >
            Details <ArrowRight size={15} />
          </button>
        </div>
        {dayRows.length ? (
          p.transactions(dayRows)
        ) : (
          <p className="bc-empty">
            {inspectingDay
              ? "No spending recorded for this day."
              : "No spending recorded in the past seven days."}
          </p>
        )}
        <button className="hv2-link" onClick={() => p.onNavigate("Spending")}>
          Explore spending <ArrowUpRight size={16} />
        </button>
      </section>
      <section className="bc-card hv2-budget bc-budget-panel">
        <div className="bc-section-head">
          <h2>
            BUDGET IN{" "}
            {new Date(`${month}-01T12:00:00`)
              .toLocaleDateString("en-US", { month: "long" })
              .toUpperCase()}
          </h2>
          <span
            className={`hv2-health health-${health.toLowerCase().replace(" ", "-")}`}
          >
            {health}
          </span>
        </div>
        <p className="hv2-caption">
          {budget.remaining < 0 ? "Over budget" : "Left To Spend"}
        </p>
        <strong
          className={`hv2-metric ${budget.remaining < 0 ? "bc-negative" : ""}`}
        >
          {money(Math.abs(budget.remaining))}
        </strong>
        <progress
          aria-label="Monthly budget consumed"
          max={Math.max(1, budget.budgeted)}
          value={budget.budgeted > 0 ? Math.max(0, budget.spending) : 0}
        />
        <p className="hv2-budget-summary">
          Spent <strong>{money(budget.spending)}</strong> of{" "}
          <strong>{money(budget.budgeted)}</strong>
        </p>
        <p className="hv2-caption">
          {ratio === null
            ? "Set a monthly plan to see your budget health."
            : budget.remaining < 0
              ? `${money(Math.abs(budget.remaining))} exceeded your plan.`
              : `${Math.max(0, Math.round(ratio * 100))}% of your plan consumed.`}
        </p>
        <button
          className="hv2-link"
          onClick={() => p.onNavigate("Spending", "Budget")}
        >
          Explore your budget <ArrowUpRight size={16} />
        </button>
      </section>
      <section className="bc-card hv2-coming bc-upcoming-panel">
        <div className="bc-section-head">
          <div>
            <p className="bc-eyebrow">A LITTLE LOOK AHEAD</p>
            <h2>Coming Up</h2>
          </div>
          <button
            className="bc-text-button"
            onClick={() => p.onNavigate("Recurring & Upcoming")}
          >
            See All <ArrowRight size={16} />
          </button>
        </div>
        {events.map((event) =>
          event.kind === "transaction" ? (
            <div key={event.id}>{p.transactions([event.item])}</div>
          ) : (
            <button
              className="bc-projection-row"
              key={event.id}
              onClick={() => p.onRecurring(event.item.ruleId)}
            >
              <span className="bc-date-chip">
                {new Date(`${event.date}T12:00:00`).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" },
                )}
              </span>
              <span>
                <strong>{event.item.name}</strong>
                <small>
                  Scheduled ·{" "}
                  {event.item.kind[0].toUpperCase() + event.item.kind.slice(1)}
                </small>
              </span>
              <strong>{money(event.item.amountMinor)}</strong>
            </button>
          ),
        )}
        {!upcoming.length && !projected.length && (
          <p>
            No upcoming commitments. Recurring items will appear here when you
            add them.
          </p>
        )}
        <p className="hv2-caption">
          Future items are projections, separate from actual spending.
        </p>
      </section>
      <section className="bc-card hv2-recent bc-activity-panel">
        <div className="bc-section-head">
          <div>
            <p className="bc-eyebrow">THE DETAILS BEHIND THE NUMBERS</p>
            <h2>Recent Activity</h2>
          </div>
          <button
            aria-label="View all transactions"
            className="bc-text-button"
            onClick={() => p.onNavigate("Transactions")}
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
        {recent.length ? (
          p.transactions(recent)
        ) : (
          <p className="bc-empty">
            No recent financial activity. Add a transaction to start your story.
          </p>
        )}
        <button className="hv2-link" onClick={p.onQuick}>
          <Plus size={16} /> Quick Add
        </button>
      </section>
      <section className="hv2-guidance" aria-label="Next steps">
        <div>
          <p className="bc-eyebrow">YOUR NEXT MOVE</p>
          <p>
            {!store.accounts.length
              ? "Start with an account to build your financial picture."
              : budget.budgeted === 0
                ? "Give this month a plan. Set a budget to track your progress."
                : budget.remaining < 0
                  ? "Review the transactions behind your budget overage."
                  : "Review your upcoming commitments and keep your plan in view."}
          </p>
        </div>
        <button
          onClick={() =>
            !store.accounts.length
              ? p.onAddAccount()
              : p.onNavigate("Spending", "Budget")
          }
        >
          Take a look <ArrowUpRight size={16} />
        </button>
        <button className="hv2-link" onClick={p.onAssistant}>
          Ask your financial copilot <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}
