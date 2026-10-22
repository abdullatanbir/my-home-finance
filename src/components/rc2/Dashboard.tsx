import { useId, useState, useRef, useEffect, type ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ArrowRight,
  Plus,
} from "lucide-react";
import {
  today,
  money,
  type FinancialStore,
  type Transaction,
} from "../../core/model";
import {
  netWorth,
  totals,
  budgetSummary,
  comparison,
  occurrences,
} from "../../core/engine";
import PeriodPicker from "./PeriodPicker";
const dateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function daysAgo(n: number) {
  const d = new Date(`${today()}T12:00:00`);
  d.setDate(d.getDate() - n);
  return dateString(d);
}
export type ChartPoint = {
  id: string;
  date: string;
  valueMinor: number;
};
export function TrendChart({
  points,
  title,
  color = "blue",
}: {
  points: ChartPoint[];
  title: string;
  color?: "blue" | "purple" | "orange";
}) {
  const gradient = useId().replaceAll(":", ""),
    [selected, setSelected] = useState<string | null>(null),
    [width, setWidth] = useState(600);
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.max(240, el.clientWidth)),
    );
    observer.observe(el);
    setWidth(Math.max(240, el.clientWidth));
    return () => observer.disconnect();
  }, [points.length]);
  const values = [...points]
    .filter((p) => p.date <= today())
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!values.length)
    return (
      <div className="bc-chart-empty">
        <span className="bc-chart-empty-line" />
        <p>Your history starts here.</p>
        <small>
          Saved observations will appear as you build your financial picture.
        </small>
      </div>
    );
  const min = Math.min(...values.map((p) => p.valueMinor)),
    max = Math.max(...values.map((p) => p.valueMinor)),
    spread = max - min || Math.max(Math.abs(max) * 0.08, 100);
  const start = Date.parse(values[0].date),
    end = Date.parse(values.at(-1)!.date);
  const coords = values.map((p) => ({
    p,
    x:
      values.length === 1
        ? width - 24
        : 24 +
          ((Date.parse(p.date) - start) / Math.max(1, end - start)) *
            (width - 48),
    y: 120 - ((p.valueMinor - min) / spread) * 88,
  }));
  const path = coords
    .map(({ x, y }, i) => `${i ? "L" : "M"}${x},${y}`)
    .join(" ");
  const active = values.find((v) => v.id === selected) || values.at(-1)!;
  const activeCoord = coords.find((c) => c.p.id === active.id)!;
  const inspect = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) * width) / box.width;
    setSelected(
      coords.reduce((a, b) => (Math.abs(a.x - x) < Math.abs(b.x - x) ? a : b)).p
        .id,
    );
  };
  return (
    <div ref={chartRef} className={`bc-trend bc-chart-${color}`}>
      <div className="bc-chart-readout" aria-live="polite">
        <span>
          {title.replace(" real observations", "")} · {active.date}
        </span>
        <strong>{money(active.valueMinor)}</strong>
      </div>
      <svg
        onPointerDown={(e) => {
          inspect(e);
          if (e.isTrusted) e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse" || e.buttons) inspect(e);
        }}
        className="bc-trend-svg"
        viewBox={`0 0 ${width} 180`}
        role="img"
        aria-label={`${title}: ${values.map((v) => `${v.date} ${money(v.valueMinor)}`).join("; ")}`}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".23" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[32, 76, 120].map((y) => (
          <line
            key={y}
            x1="24"
            x2={width - 24}
            y1={y}
            y2={y}
            stroke="var(--bc-border)"
            strokeDasharray="3 7"
          />
        ))}
        {coords.length > 1 && (
          <>
            <path
              d={`${path} L${coords.at(-1)!.x},142 L${coords[0].x},142 Z`}
              fill={`url(#${gradient})`}
            />
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        <line
          data-testid="chart-crosshair"
          x1={activeCoord.x}
          x2={activeCoord.x}
          y1="20"
          y2="142"
          stroke="currentColor"
          strokeDasharray="4 3"
        />
        <circle
          cx={activeCoord.x}
          cy={activeCoord.y}
          r="7"
          fill="currentColor"
        />
        {coords.map(({ p, x, y }) => (
          <g key={p.id}>
            <circle
              cx={x}
              cy={y}
              r="4"
              fill="var(--bc-card)"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle
              cx={x}
              cy={y}
              r="13"
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${p.date}: ${money(p.valueMinor)}`}
              onFocus={() => setSelected(p.id)}
              onMouseEnter={() => setSelected(p.id)}
              onClick={() => setSelected(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(p.id);
                }
              }}
            >
              <title>
                {p.date}: {money(p.valueMinor)}
              </title>
            </circle>
          </g>
        ))}
        <text x="24" y="170" fill="var(--bc-muted)" fontSize="11">
          {values[0].date}
        </text>
        {values.length > 1 && (
          <text
            x={width - 24}
            y="170"
            textAnchor="end"
            fill="var(--bc-muted)"
            fontSize="11"
          >
            {values.at(-1)!.date}
          </text>
        )}
      </svg>
    </div>
  );
}
export function WealthPanel({
  store,
  onOpen,
  onSnapshot,
  onAddAccount,
}: {
  store: FinancialStore;
  onOpen: () => void;
  onSnapshot: () => void;
  onAddAccount: () => void;
}) {
  const [range, setRange] = useState("1M"),
    [context, setContext] = useState<"Net Worth" | "Assets" | "Liabilities">(
      "Net Worth",
    );
  const wealth = netWorth(store);
  const cutoff = (() => {
    if (range === "ALL") return "0000-01-01";
    if (range === "1W") return daysAgo(6);
    const n = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 }[range] || 1;
    const d = new Date(`${today()}T12:00:00`),
      day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    d.setDate(
      Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()),
    );
    return dateString(d);
  })();
  let points: ChartPoint[] = [];
  if (context === "Net Worth") {
    points = store.netWorthSnapshots.filter(
      (p) => p.date >= cutoff && p.date < today(),
    );
    if (
      store.accounts.length ||
      store.investments.length ||
      store.netWorthSnapshots.length
    )
      points = [
        ...points,
        { id: "current-observation", date: today(), valueMinor: wealth.total },
      ];
  } else {
    const dates = new Set([
      ...store.accounts.map((a) => a.openingBalanceDate),
      ...store.transactions
        .filter((t) => ["posted", "paid"].includes(t.status))
        .map((t) => t.transactionDate),
      ...store.investments.flatMap((i) => i.valuations.map((v) => v.date)),
    ]);
    if (dates.size) dates.add(today());
    points = [...dates]
      .filter((d) => d >= cutoff && d <= today())
      .sort()
      .map((date) => ({
        id: `${context}-${date}`,
        date,
        valueMinor: netWorth(store, date)[
          context === "Assets" ? "assets" : "liabilities"
        ],
      }));
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  const value =
    context === "Net Worth"
      ? wealth.total
      : context === "Assets"
        ? wealth.assets
        : wealth.liabilities;
  const delta =
    points.length > 1 ? points.at(-1)!.valueMinor - points[0].valueMinor : null;
  return (
    <section className="bc-card bc-wealth-panel">
      <div className="bc-section-head">
        <div>
          <p className="bc-eyebrow">THE BIG PICTURE</p>
          <h2>Your wealth, in perspective</h2>
        </div>
        <button
          className="bc-text-button"
          onClick={onOpen}
          aria-label="Open Net Worth details"
        >
          <ArrowUpRight size={19} />
        </button>
      </div>
      <div
        className="bc-wealth-context"
        role="group"
        aria-label="Net worth context"
      >
        {(["Net Worth", "Assets", "Liabilities"] as const).map((name) => (
          <button
            key={name}
            aria-pressed={context === name}
            onClick={() => setContext(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="bc-wealth-number">
        <strong>{money(value)}</strong>
        {delta !== null ? (
          <span className={delta >= 0 ? "bc-positive" : "bc-negative"}>
            {delta >= 0 ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}{" "}
            {money(Math.abs(delta))} <small>across shown observations</small>
          </span>
        ) : (
          <span className="bc-muted-note">
            Current {context.toLowerCase()} · no estimated history
          </span>
        )}
      </div>
      <div className="ex-position-totals">
        <button onClick={() => setContext("Assets")}>
          <span>Assets</span>
          <strong>{money(wealth.assets)}</strong>
        </button>
        <button onClick={() => setContext("Liabilities")}>
          <span>Liabilities</span>
          <strong>{money(wealth.liabilities)}</strong>
        </button>
      </div>
      <TrendChart
        points={points}
        title={`${context} real observations`}
        color={
          context === "Net Worth"
            ? "blue"
            : context === "Assets"
              ? "purple"
              : "orange"
        }
      />
      <div
        className="bc-range-control"
        role="group"
        aria-label="Net worth history period"
      >
        {["1W", "1M", "3M", "6M", "1Y", "ALL"].map((r) => (
          <button
            key={r}
            aria-pressed={range === r}
            onClick={() => setRange(r)}
          >
            {r}
          </button>
        ))}
      </div>
      <p className="bc-period-context">
        {range === "ALL" ? points[0]?.date || "No observations" : cutoff} –{" "}
        {today()} ·{" "}
        {
          {
            "1W": "1 Week",
            "1M": "1 Month",
            "3M": "3 Months",
            "6M": "6 Months",
            "1Y": "1 Year",
            ALL: "All history",
          }[range]
        }
      </p>
      <button className="bc-primary" onClick={onAddAccount}>
        <Plus size={15} /> Add Account
      </button>
      <div className="bc-wealth-foot">
        <small>
          {context === "Net Worth"
            ? "Saved snapshots + current value. No history is estimated."
            : "Derived from actual saved account activity and valuation dates."}
        </small>
        <details>
          <summary>More wealth actions</summary>
          <button onClick={onOpen}>View Net Worth details</button>
          <button className="bc-text-button" onClick={onSnapshot}>
            Save snapshot
          </button>
        </details>
      </div>
    </section>
  );
}
export default function Dashboard({
  store,
  period,
  onPeriod,
  years,
  onNavigate,
  onDay,
  onSnapshot,
  onAddAccount,
  onRecurring,
  transactions,
}: {
  store: FinancialStore;
  period: string;
  onPeriod: (p: string) => void;
  years: number[];
  onNavigate: (v: string, tab?: string) => void;
  onDay: (date: string) => void;
  onSnapshot: () => void;
  onAddAccount: () => void;
  onRecurring: (id: string) => void;
  transactions: (items: Transaction[]) => ReactNode;
}) {
  const budget = budgetSummary(store, period),
    week = Array.from({ length: 7 }, (_, i) => {
      const date = daysAgo(6 - i),
        prior = daysAgo(13 - i);
      return {
        date,
        current: totals(store.transactions, date, date).spending,
        previous: totals(store.transactions, prior, prior).spending,
      };
    });
  const current = week.reduce((n, d) => n + d.current, 0),
    previous = week.reduce((n, d) => n + d.previous, 0),
    max = Math.max(
      ...week.flatMap((d) => [Math.abs(d.current), Math.abs(d.previous)]),
      1,
    ),
    percent = comparison(current, previous);
  const priorMonthDate = new Date(`${period}-01T12:00:00`);
  priorMonthDate.setMonth(priorMonthDate.getMonth() - 1);
  const priorMonth = dateString(priorMonthDate).slice(0, 7),
    priorMonthSpent = totals(
      store.transactions,
      `${priorMonth}-01`,
      `${priorMonth}-31`,
    ).spending,
    monthChange = comparison(budget.spending, priorMonthSpent),
    priorMonthName = priorMonthDate.toLocaleDateString("en-US", {
      month: "long",
    });
  const upcoming = store.transactions
      .filter((t) => ["scheduled", "pending"].includes(t.status))
      .sort((a, b) =>
        (a.dueDate || a.transactionDate).localeCompare(
          b.dueDate || b.transactionDate,
        ),
      )
      .slice(0, 3),
    projected = occurrences(
      store,
      today(),
      `${Number(today().slice(0, 4)) + 1}-12-31`,
    )
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
  return (
    <div className="bc-dashboard">
      <WealthPanel
        store={store}
        onOpen={() => onNavigate("Net Worth")}
        onSnapshot={onSnapshot}
        onAddAccount={onAddAccount}
      />
      <div className="bc-dashboard-middle">
        <section className="bc-card bc-spend-panel">
          <div className="bc-section-head">
            <div>
              <p className="bc-eyebrow">YOUR EVERYDAY</p>
              <h2>Spent · Last 7 Days</h2>
            </div>
            <button
              className="bc-text-button"
              aria-label="Open Spending"
              onClick={() => onNavigate("Spending")}
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
          <strong className="bc-panel-amount">{money(current)}</strong>
          <p className="bc-comparison">
            {percent === null
              ? "No earlier spending to compare"
              : `${Math.abs(percent).toFixed(1)}% ${percent > 0 ? "more" : "less"} than the previous 7 days`}
          </p>
          <div
            className="bc-daily-bars"
            aria-label="Daily spending compared with previous week"
          >
            {week.map((d) => (
              <button
                key={d.date}
                aria-label={`${d.date}: ${money(d.current)}, previous week ${money(d.previous)}`}
                onClick={() => onDay(d.date)}
              >
                <span className="bc-bar-pair">
                  <i
                    className="bc-bar-previous"
                    style={{
                      height: `${(Math.abs(d.previous) / max) * 82}px`,
                    }}
                  />
                  <i
                    className={
                      d.current < 0 ? "bc-bar-refund" : "bc-bar-current"
                    }
                    style={{
                      height: `${(Math.abs(d.current) / max) * 82}px`,
                    }}
                  />
                </span>
                <small>
                  {new Date(`${d.date}T12:00:00`).toLocaleDateString("en-US", {
                    weekday: "narrow",
                  })}
                </small>
              </button>
            ))}
          </div>
          <div className="bc-chart-legend">
            <span>
              <i className="bc-legend-current" /> Last 7 days
            </span>
            <span>
              <i className="bc-legend-previous" /> Previous 7 days ·{" "}
              {money(previous)}
            </span>
          </div>
          <div className="ex-home-spending-foot">
            <small>Today and the previous six calendar days.</small>
            <button
              className="bc-text-button"
              onClick={() => onNavigate("Spending")}
            >
              Explore spending <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
        <section className="bc-card bc-budget-panel">
          <div className="bc-section-head">
            <div>
              <p className="bc-eyebrow">MAKE ROOM FOR WHAT MATTERS</p>
              <h2>Your monthly budget</h2>
            </div>
            <Wallet size={19} />
          </div>
          <PeriodPicker value={period} onChange={onPeriod} years={years} />
          <div className="bc-budget-amount">
            <strong className={budget.remaining < 0 ? "bc-negative" : ""}>
              {money(Math.abs(budget.remaining))}
            </strong>
            <small>
              {budget.remaining < 0 ? "overspent" : "remaining"} of{" "}
              {money(budget.budgeted)} planned
            </small>
          </div>
          <p className="bc-month-comparison">
            {monthChange === null
              ? `No actual spending recorded in ${priorMonthName} to compare.`
              : `Actual spending is ${Math.abs(monthChange).toFixed(1)}% ${monthChange > 0 ? "more" : "less"} than ${priorMonthName}.`}
          </p>
          <progress
            aria-label="Monthly budget used"
            value={Math.max(0, budget.spending)}
            max={Math.max(budget.budgeted, 1)}
          />
          <div className="bc-budget-evidence">
            <span>
              Planned<strong>{money(budget.budgeted)}</strong>
            </span>
            <span>
              Spent<strong>{money(budget.spending)}</strong>
            </span>
            <span>
              {budget.remaining < 0 ? "Overspent" : "Remaining"}
              <strong>{money(Math.abs(budget.remaining))}</strong>
            </span>
          </div>
          <button
            className="bc-text-button"
            onClick={() => onNavigate("Spending", "Budget")}
          >
            Explore your budget <ArrowUpRight size={15} />
          </button>
        </section>
      </div>
      <div className="bc-dashboard-lower">
        <section className="bc-card bc-upcoming-panel">
          <div className="bc-section-head">
            <div>
              <p className="bc-eyebrow">A LITTLE LOOK AHEAD</p>
              <h2>Coming up</h2>
            </div>
            <button
              className="bc-text-button"
              onClick={() => onNavigate("Recurring & Upcoming")}
            >
              See all <ArrowRight size={15} />
            </button>
          </div>
          {upcoming.length > 0 && transactions(upcoming)}
          {projected.map((p) => (
            <button
              className="bc-projection-row"
              key={p.id}
              onClick={() => onRecurring(p.ruleId)}
            >
              <span className="bc-date-chip">
                {new Date(`${p.date}T12:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>Scheduled · {p.kind}</small>
              </span>
              <strong>{money(p.amountMinor)}</strong>
            </button>
          ))}
          {!upcoming.length && !projected.length && (
            <p className="bc-empty">
              A clear horizon. No scheduled obligations yet.
            </p>
          )}
        </section>
        <section className="bc-card bc-activity-panel">
          <div className="bc-section-head">
            <div>
              <p className="bc-eyebrow">THE DETAILS BEHIND THE NUMBERS</p>
              <h2>Recent activity</h2>
            </div>
            <button
              className="bc-text-button"
              aria-label="View all transactions"
              onClick={() => onNavigate("Transactions")}
            >
              <ArrowRight size={18} />
            </button>
          </div>
          {transactions(
            [...store.transactions]
              .filter((t) => t.transactionDate <= today())
              .sort(
                (a, b) =>
                  b.transactionDate.localeCompare(a.transactionDate) ||
                  b.createdAt.localeCompare(a.createdAt),
              )
              .slice(0, 4),
          )}
        </section>
      </div>
    </div>
  );
}
