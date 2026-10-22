import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  money,
  today,
  type FinancialStore,
  type Transaction,
} from "../../core/model";
import { totals, occurrences } from "../../core/engine";
export default function SpendingCalendar({
  store,
  period,
  day,
  onDay,
  onPeriod,
  transactions,
  inlineEvidence = true,
}: {
  store: FinancialStore;
  period: string;
  day: string;
  onDay: (day: string) => void;
  onPeriod: (period: string) => void;
  transactions: (items: Transaction[]) => ReactNode;
  inlineEvidence?: boolean;
}) {
  const count = new Date(
    Number(period.slice(0, 4)),
    Number(period.slice(5)),
    0,
  ).getDate();
  const first = new Date(`${period}-01T12:00:00`).getDay();
  const projected = occurrences(store, `${period}-01`, `${period}-${count}`);
  const values = Array.from({ length: count }, (_, i) => {
    const date = `${period}-${String(i + 1).padStart(2, "0")}`;
    const items = store.transactions.filter((t) => t.transactionDate === date);
    return {
      date,
      items,
      value: totals(items, date, date).spending,
      scheduled: projected.filter((p) => p.date === date),
    };
  });
  const max = Math.max(1, ...values.map((v) => Math.abs(v.value)));
  const shift = (n: number) => {
    const d = new Date(`${period}-01T12:00:00`);
    d.setMonth(d.getMonth() + n);
    onPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const selected = values.find((v) => v.date === day);
  return (
    <section className="bc-card ex-calendar-panel">
      <div className="bc-section-head">
        <div>
          <p className="bc-eyebrow">YOUR SPENDING, DAY BY DAY</p>
          <h2>Spending calendar</h2>
        </div>
        <div className="ex-calendar-arrows">
          <button
            aria-label="Previous calendar month"
            disabled={period <= "2026-01"}
            onClick={() => shift(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Next calendar month"
            disabled={period >= "2050-12"}
            onClick={() => shift(1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <p className="ex-calendar-month">
        {new Date(`${period}-01T12:00:00`).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
      </p>
      <div className="bc-calendar">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <span key={d}>{d}</span>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {values.map(({ date, items, value, scheduled }, i) => (
          <button
            key={date}
            aria-pressed={day === date}
            aria-current={date === today() ? "date" : undefined}
            className={`${day === date ? "selected" : ""} ${value < 0 ? "is-refund" : ""}`}
            aria-label={`${date}, ${money(value)} spending, ${items.length} activity, ${scheduled.length} scheduled`}
            onClick={() => onDay(date)}
            style={{
              background:
                value !== 0
                  ? `color-mix(in srgb, ${value < 0 ? "var(--bc-positive)" : "var(--bc-purple)"} ${8 + (Math.abs(value) / max) * 28}%, var(--bc-card))`
                  : undefined,
            }}
          >
            <strong>{i + 1}</strong>
            <small>{value !== 0 ? money(value) : "—"}</small>
            <span className="ex-day-dot" aria-hidden="true">
              {items.length ? "•" : ""}
              {scheduled.length ? "◦" : ""}
            </span>
          </button>
        ))}
      </div>
      <div className="ex-calendar-legend">
        <span>● Recorded activity</span>
        <span>◦ Recurring projection</span>
        <span>Green = net refund</span>
      </div>
      <section className="ex-day-evidence" aria-live="polite">
        <div className="bc-section-head">
          <h3>{selected ? `Daily Summary · ${day}` : "Choose a day"}</h3>
          {selected && (
            <button className="bc-text-button" onClick={() => onDay("")}>
              All days
            </button>
          )}
        </div>
        {selected ? (
          <>
            <p>
              Income {money(totals(selected.items, day, day).income)} · Spending{" "}
              {money(selected.value)}
            </p>
            {inlineEvidence ? (
              transactions(selected.items)
            ) : (
              <small>
                {selected.items.length} recorded activity · See day evidence
                below.
              </small>
            )}
            {selected.scheduled.map((p) => (
              <p key={p.id}>
                {p.name} · Scheduled {money(p.amountMinor)} · {p.kind}
              </p>
            ))}
          </>
        ) : (
          <p>
            Inspect the activity behind a day. Future obligations remain
            separate from actual spending.
          </p>
        )}
      </section>
    </section>
  );
}
