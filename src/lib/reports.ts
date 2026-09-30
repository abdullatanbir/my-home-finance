import type {
 DisplayStatus,
 Transaction
} from './data';

import {
 displayStatusLabel,
 getDisplayStatus
} from './data';


/* =========================================================
   FORMATTERS
   ========================================================= */

const money = (amount: number) =>
    new Intl.NumberFormat(
        'en-US',
        {
         style: 'currency',
         currency: 'USD'
        }
    ).format(amount);


function escapeHtml(
    value: unknown
) {
 return String(
     value ?? ''
 ).replace(
     /[&<>"']/g,
     character =>
         ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
         })[character] || character
 );
}


function monthName(
    month: number
) {
 return new Date(
     2000,
     month - 1
 ).toLocaleString(
     'en-US',
     {
      month: 'long'
     }
 );
}


/* =========================================================
   GROUP NORMALIZATION
   ========================================================= */

const reportGroups = [
 'Home',
 'Personal',
 'Credit & Loan',
 'Others'
] as const;


function normalizedGroup(
    group: string | null
) {
 switch (group) {
  case 'Home Expenses':
   return 'Home';

  case 'Credit Card / Debt':
   return 'Credit & Loan';

  case 'Everyday / Misc':
   return 'Others';

  default:
   return group || 'Others';
 }
}


/* =========================================================
   STATUS HELPERS
   ========================================================= */

function statusText(
    transaction: Transaction
) {
 return displayStatusLabel(
     getDisplayStatus(
         transaction
     )
 );
}


function statusClass(
    status: DisplayStatus
) {
 switch (status) {
  case 'paid':
   return 'paid';

  case 'upcoming':
   return 'upcoming';

  case 'due-today':
   return 'due';

  case 'overdue':
   return 'overdue';

  default:
   return 'unpaid';
 }
}


/* =========================================================
   COMMON REPORT CSS
   ========================================================= */

function reportStyles() {
 return `
        <style>
            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                padding: 32px;
                font-family:
                    Inter,
                    system-ui,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;

                color: #173047;
                background: #ffffff;
                font-size: 13px;
            }

            .report {
                max-width: 1000px;
                margin: 0 auto;
            }

            .brand {
                margin-bottom: 24px;
                padding-bottom: 18px;
                border-bottom: 2px solid #dce8e2;
            }

            .brand small {
                display: block;
                margin-bottom: 5px;

                color: #168176;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 1.3px;
            }

            .brand h1 {
                margin: 0;
                color: #153b34;
                font-size: 26px;
            }

            .brand p {
                margin: 5px 0 0;
                color: #738980;
            }

            h2 {
                margin:
                    26px 0
                    10px;

                color: #193e37;
                font-size: 17px;
            }

            .summary {
                display: grid;
                grid-template-columns:
                    repeat(3, 1fr);

                gap: 10px;
                margin: 18px 0;
            }

            .summaryCard {
                padding: 13px;

                border:
                    1px solid
                    #dce7e2;

                border-radius:
                    12px;

                background:
                    #f9fbfa;
            }

            .summaryCard small {
                display: block;
                margin-bottom: 5px;

                color: #738980;
                font-size: 10px;
            }

            .summaryCard strong {
                color: #173f36;
                font-size: 17px;
            }

            .statusSummary {
                display: grid;
                grid-template-columns:
                    repeat(5, 1fr);

                gap: 8px;
                margin: 12px 0;
            }

            .statusSummary div {
                padding: 10px;

                border:
                    1px solid
                    #dce7e2;

                border-radius:
                    10px;

                background:
                    #fafcfb;
            }

            .statusSummary small {
                display: block;

                margin-bottom:
                    4px;

                color: #738980;

                font-size:
                    9px;
            }

            .statusSummary b {
                font-size: 12px;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0 22px;
            }

            th,
            td {
                padding: 9px 8px;

                border-bottom:
                    1px solid
                    #e1e9e5;

                text-align: left;
                vertical-align: top;
            }

            th {
                color: #526c63;
                background: #f5f8f6;

                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: .4px;
            }

            td.amount,
            th.amount {
                text-align: right;
                white-space: nowrap;
            }

            .status {
                display: inline-block;

                padding:
                    4px 7px;

                border-radius:
                    999px;

                font-size:
                    9px;

                font-weight:
                    800;
            }

            .status.paid {
                color: #17724f;
                background: #e6f6ed;
            }

            .status.upcoming {
                color: #856515;
                background: #fff6d8;
            }

            .status.due {
                color: #a94d20;
                background: #ffebe1;
            }

            .status.overdue {
                color: #b13b43;
                background: #ffe7e8;
            }

            .status.unpaid {
                color: #586c65;
                background: #edf2ef;
            }

            .positive {
                color: #17724f;
            }

            .negative {
                color: #b13b43;
            }

            .note {
                margin-top: 20px;
                padding: 12px;

                border-radius:
                    10px;

                background:
                    #f5f8f6;

                color:
                    #667d75;

                font-size:
                    11px;
            }

            @media print {
                body {
                    padding: 0;
                }

                .report {
                    max-width: none;
                }

                .summaryCard,
                .statusSummary div,
                table {
                    break-inside: avoid;
                }
            }
        </style>
    `;
}


/* =========================================================
   MONTHLY REPORT
   ========================================================= */

export function monthlyReportHtml(
    transactions: Transaction[],
    year: number,
    month: number,
    budget: number
) {
 const incomeTransactions =
     transactions.filter(
         transaction =>
             transaction.kind ===
             'income'
     );

 const expenseTransactions =
     transactions.filter(
         transaction =>
             transaction.kind ===
             'expense'
     );


 const income =
     incomeTransactions.reduce(
         (sum, transaction) =>
             sum +
             Number(
                 transaction.amount
             ),
         0
     );


 const expenses =
     expenseTransactions.reduce(
         (sum, transaction) =>
             sum +
             Number(
                 transaction.amount
             ),
         0
     );


 const balance =
     income - expenses;


 const savings =
     Math.max(
         0,
         balance
     );


 const savingsRate =
     income > 0
         ? (
         savings /
         income
     ) * 100
         : 0;


 /* -----------------------------------------------------
    AUTOMATIC STATUS TOTALS
    ----------------------------------------------------- */

 let paid = 0;
 let dueToday = 0;
 let overdue = 0;
 let upcoming = 0;
 let unpaid = 0;


 expenseTransactions.forEach(
     transaction => {

      const amount =
          Number(
              transaction.amount
          );

      const status =
          getDisplayStatus(
              transaction
          );

      switch (status) {
       case 'paid':
        paid += amount;
        break;

       case 'due-today':
        dueToday += amount;
        break;

       case 'overdue':
        overdue += amount;
        break;

       case 'upcoming':
        upcoming += amount;
        break;

       case 'unpaid':
        unpaid += amount;
        break;
      }
     }
 );


 /* -----------------------------------------------------
    GROUP BREAKDOWN
    ----------------------------------------------------- */

 const groupRows =
     reportGroups
         .map(group => {

          const groupTotal =
              expenseTransactions
                  .filter(
                      transaction =>
                          normalizedGroup(
                              transaction
                                  .group_name
                          ) === group
                  )
                  .reduce(
                      (
                          sum,
                          transaction
                      ) =>
                          sum +
                          Number(
                              transaction
                                  .amount
                          ),
                      0
                  );

          return `
                    <tr>
                        <td>
                            ${escapeHtml(group)}
                        </td>

                        <td class="amount">
                            ${money(groupTotal)}
                        </td>
                    </tr>
                `;
         })
         .join('');


 /* -----------------------------------------------------
    DETAILED EXPENSES
    ----------------------------------------------------- */

 const expenseRows =
     expenseTransactions
         .map(transaction => {

          const displayStatus =
              getDisplayStatus(
                  transaction
              );

          return `
                    <tr>
                        <td>
                            ${escapeHtml(
              transaction
                  .occurred_on
          )}
                        </td>

                        <td>
                            ${escapeHtml(
              transaction.name
          )}
                        </td>

                        <td>
                            ${escapeHtml(
              transaction.category ||
              normalizedGroup(
                  transaction
                      .group_name
              )
          )}
                        </td>

                        <td>
                            ${
              transaction.due_date
                  ? escapeHtml(
                      transaction
                          .due_date
                  )
                  : '—'
          }
                        </td>

                        <td>
                            <span
                                class="status ${statusClass(
              displayStatus
          )}"
                            >
                                ${escapeHtml(
              statusText(
                  transaction
              )
          )}
                            </span>
                        </td>

                        <td class="amount">
                            ${money(
              Number(
                  transaction
                      .amount
              )
          )}
                        </td>
                    </tr>
                `;
         })
         .join('');


 const budgetRemaining =
     budget > 0
         ? budget - expenses
         : 0;


 return `
        <!doctype html>

        <html lang="en">

        <head>
            <meta charset="utf-8">

            <meta
                name="viewport"
                content="width=device-width,
                initial-scale=1"
            >

            <title>
                My Home Finance -
                ${escapeHtml(
     monthName(month)
 )}
                ${year}
            </title>

            ${reportStyles()}
        </head>

        <body>

        <main class="report">

            <header class="brand">
                <small>
                    MY HOME FINANCE
                </small>

                <h1>
                    Monthly Financial Report
                </h1>

                <p>
                    ${escapeHtml(
     monthName(month)
 )}
                    ${year}
                </p>
            </header>


            <section class="summary">

                <div class="summaryCard">
                    <small>
                        Total Income
                    </small>

                    <strong>
                        ${money(income)}
                    </strong>
                </div>


                <div class="summaryCard">
                    <small>
                        Total Expenses
                    </small>

                    <strong>
                        ${money(expenses)}
                    </strong>
                </div>


                <div class="summaryCard">
                    <small>
                        Remaining Balance
                    </small>

                    <strong
                        class="${
     balance < 0
         ? 'negative'
         : 'positive'
 }"
                    >
                        ${money(balance)}
                    </strong>
                </div>


                <div class="summaryCard">
                    <small>
                        Savings
                    </small>

                    <strong>
                        ${money(savings)}
                    </strong>
                </div>


                <div class="summaryCard">
                    <small>
                        Savings Rate
                    </small>

                    <strong>
                        ${savingsRate.toFixed(
     1
 )}%
                    </strong>
                </div>


                <div class="summaryCard">
                    <small>
                        Budget vs Actual
                    </small>

                    <strong>
                        ${
     budget > 0
         ? money(
             budgetRemaining
         )
         : 'Not Set'
 }
                    </strong>
                </div>

            </section>


            <h2>
                Bills & Payment Status
            </h2>

            <section class="statusSummary">

                <div>
                    <small>Paid</small>
                    <b>${money(paid)}</b>
                </div>

                <div>
                    <small>Due Today</small>
                    <b>${money(dueToday)}</b>
                </div>

                <div>
                    <small>Overdue</small>
                    <b>${money(overdue)}</b>
                </div>

                <div>
                    <small>Upcoming</small>
                    <b>${money(upcoming)}</b>
                </div>

                <div>
                    <small>
                        Unpaid / No Due Date
                    </small>
                    <b>${money(unpaid)}</b>
                </div>

            </section>


            <h2>
                Expense Groups
            </h2>

            <table>
                <thead>
                    <tr>
                        <th>
                            Expense Group
                        </th>

                        <th class="amount">
                            Total
                        </th>
                    </tr>
                </thead>

                <tbody>
                    ${groupRows}
                </tbody>
            </table>


            <h2>
                Detailed Expenses
            </h2>

            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Expense</th>
                        <th>Category</th>
                        <th>Due Date</th>
                        <th>Status</th>

                        <th class="amount">
                            Amount
                        </th>
                    </tr>
                </thead>

                <tbody>
                    ${
     expenseRows ||
     `
                        <tr>
                            <td colspan="6">
                                No expenses recorded
                                for this month.
                            </td>
                        </tr>
                        `
 }
                </tbody>
            </table>


            <div class="note">
                Budget remaining is calculated as
                monthly budget minus total recorded
                expenses. Payment status is calculated
                automatically from payment state and
                due date.
            </div>

        </main>

        </body>

        </html>
    `;
}


/* =========================================================
   YEARLY REPORT
   ========================================================= */

export function yearlyReportHtml(
    transactions: Transaction[],
    year: number
) {
 let annualIncome = 0;
 let annualExpenses = 0;


 const rows =
     Array.from(
         { length: 12 },
         (_, index) => {

          const month =
              index + 1;

          const monthPrefix =
              `${year}-${String(
                  month
              ).padStart(
                  2,
                  '0'
              )}`;


          const monthTransactions =
              transactions.filter(
                  transaction =>
                      transaction
                          .occurred_on
                          .startsWith(
                              monthPrefix
                          )
              );


          const income =
              monthTransactions
                  .filter(
                      transaction =>
                          transaction.kind ===
                          'income'
                  )
                  .reduce(
                      (
                          sum,
                          transaction
                      ) =>
                          sum +
                          Number(
                              transaction
                                  .amount
                          ),
                      0
                  );


          const expenses =
              monthTransactions
                  .filter(
                      transaction =>
                          transaction.kind ===
                          'expense'
                  )
                  .reduce(
                      (
                          sum,
                          transaction
                      ) =>
                          sum +
                          Number(
                              transaction
                                  .amount
                          ),
                      0
                  );


          const balance =
              income -
              expenses;


          const savings =
              Math.max(
                  0,
                  balance
              );


          annualIncome +=
              income;

          annualExpenses +=
              expenses;


          return `
                    <tr>
                        <td>
                            ${escapeHtml(
              monthName(
                  month
              )
          )}
                        </td>

                        <td class="amount">
                            ${money(income)}
                        </td>

                        <td class="amount">
                            ${money(expenses)}
                        </td>

                        <td
                            class="amount ${
              balance < 0
                  ? 'negative'
                  : 'positive'
          }"
                        >
                            ${money(balance)}
                        </td>

                        <td class="amount">
                            ${money(savings)}
                        </td>
                    </tr>
                `;
         }
     ).join('');


 const annualBalance =
     annualIncome -
     annualExpenses;


 const annualSavings =
     Math.max(
         0,
         annualBalance
     );


 const annualSavingsRate =
     annualIncome > 0
         ? (
         annualSavings /
         annualIncome
     ) * 100
         : 0;


 return `
        <!doctype html>

        <html lang="en">

        <head>
            <meta charset="utf-8">

            <meta
                name="viewport"
                content="width=device-width,
                initial-scale=1"
            >

            <title>
                My Home Finance -
                ${year} Yearly Report
            </title>

            ${reportStyles()}
        </head>

        <body>

        <main class="report">

            <header class="brand">
                <small>
                    MY HOME FINANCE
                </small>

                <h1>
                    ${year}
                    Yearly Financial Report
                </h1>

                <p>
                    January – December
                    financial summary
                </p>
            </header>


            <section class="summary">

                <div class="summaryCard">
                    <small>
                        Annual Income
                    </small>

                    <strong>
                        ${money(
     annualIncome
 )}
                    </strong>
                </div>


                <div class="summaryCard">
                    <small>
                        Annual Expenses
                    </small>

                    <strong>
                        ${money(
     annualExpenses
 )}
                    </strong>
                </div>


                <div class="summaryCard">
                    <small>
                        Net Balance
                    </small>

                    <strong
                        class="${
     annualBalance < 0
         ? 'negative'
         : 'positive'
 }"
                    >
                        ${money(
     annualBalance
 )}
                    </strong>
                </div>


                <div class="summaryCard">
                    <small>
                        Total Savings
                    </small>

                    <strong>
                        ${money(
     annualSavings
 )}
                    </strong>
                </div>


                <div class="summaryCard">
                    <small>
                        Savings Rate
                    </small>

                    <strong>
                        ${annualSavingsRate.toFixed(
     1
 )}%
                    </strong>
                </div>

            </section>


            <h2>
                January – December Summary
            </h2>

            <table>
                <thead>
                    <tr>
                        <th>Month</th>

                        <th class="amount">
                            Income
                        </th>

                        <th class="amount">
                            Expenses
                        </th>

                        <th class="amount">
                            Balance
                        </th>

                        <th class="amount">
                            Savings
                        </th>
                    </tr>
                </thead>

                <tbody>
                    ${rows}
                </tbody>
            </table>


            <div class="note">
                The yearly report summarizes each
                month and does not include individual
                transaction details.
            </div>

        </main>

        </body>

        </html>
    `;
}


/* =========================================================
   PRINT / SAVE AS PDF
   ========================================================= */

export function printHtml(
    html: string
) {
 const reportWindow =
     window.open(
         '',
         '_blank'
     );

 if (!reportWindow) {
  throw new Error(
      'Popup blocked. Allow popups to open the report.'
  );
 }

 reportWindow.document.open();

 reportWindow.document.write(
     html
 );

 reportWindow.document.close();

 reportWindow.focus();

 window.setTimeout(
     () => {
      reportWindow.print();
     },
     300
 );
}