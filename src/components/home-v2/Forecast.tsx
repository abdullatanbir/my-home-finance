import { useState } from "react";
import { today, money, minor, type FinancialStore } from "../../core/model";
import { netWorth, totals } from "../../core/engine";
export default function Forecast({ store }: { store: FinancialStore }) {
  const month = today().slice(0, 7),
    actual = totals(store.transactions, `${month}-01`, today());
  const [income, setIncome] = useState(String(actual.income / 100)),
    [spending, setSpending] = useState(String(actual.spending / 100)),
    [horizon, setHorizon] = useState(3);
  let cashFlow = 0,
    error = "";
  try {
    cashFlow = minor(income) - minor(spending);
    if (
      !Number.isSafeInteger(cashFlow) ||
      !Number.isSafeInteger(netWorth(store).total + cashFlow * horizon)
    )
      throw Error("Scenario exceeds the supported amount.");
  } catch (e) {
    error = e instanceof Error ? e.message : "Enter valid amounts.";
  }
  const start = netWorth(store).total;
  return (
    <section className="bc-card hv2-forecast-page">
      <p className="bc-eyebrow">EXPLORE A POSSIBILITY</p>
      <h2>Cash flow & net worth scenarios</h2>
      <p>
        These are local scenarios, not predictions. Starting value comes from
        your current canonical Net Worth. Income and spending inputs begin with
        this month’s actuals so far; they are not estimates of a full month.
      </p>
      <div className="bc-form-grid">
        <label>
          Monthly income assumption
          <input
            type="number"
            step="0.01"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
          />
        </label>
        <label>
          Monthly spending assumption
          <input
            type="number"
            step="0.01"
            value={spending}
            onChange={(e) => setSpending(e.target.value)}
          />
        </label>
        <label>
          Scenario horizon
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
          >
            {[1, 3, 6, 12].map((n) => (
              <option key={n} value={n}>
                {n} months
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <div className="hv2-scenario-metrics">
            <span>
              Current Net Worth<strong>{money(start)}</strong>
            </span>
            <span>
              Assumed monthly cash flow<strong>{money(cashFlow)}</strong>
            </span>
            <span>
              Scenario Net Worth after {horizon} months
              <strong>{money(start + cashFlow * horizon)}</strong>
            </span>
          </div>
          <div className="hv2-scenario-table">
            <table>
              <caption>Monthly scenario, using your assumptions</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Cash flow</th>
                  <th scope="col">Scenario Net Worth</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: horizon }, (_, i) => {
                  const d = new Date(`${today()}T12:00:00`);
                  d.setDate(1);
                  d.setMonth(d.getMonth() + i + 1);
                  return (
                    <tr key={i}>
                      <th scope="row">
                        {d.toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </th>
                      <td>{money(cashFlow)}</td>
                      <td>{money(start + cashFlow * (i + 1))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="hv2-caption">
        Assumes cash flow remains in owned accounts. Excludes market changes,
        interest, tax and unentered commitments. Transfers between owned
        accounts do not create wealth. Inputs do not modify your accounts,
        transactions, budgets or saved history.
      </p>
    </section>
  );
}
