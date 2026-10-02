# FinHub — agent guide

Keep Cursor fast and consistent on this codebase.

## Stack

- React 19 + Vite + Tailwind
- Redux Toolkit + React Router
- Firebase Auth + Firestore
- Chart.js (`react-chartjs-2`)

## Before exploring code

This repo has a graphify knowledge graph in `graphify-out/`.

1. Run `graphify query "<question>"` (or `path` / `explain`) before broad Read/Grep/Glob.
2. After editing code files, run `graphify update .`.
3. See `.cursor/rules/graphify.mdc` (always on).

## App map

| Area | Path |
|------|------|
| Overview dashboard | `src/pages/Dashboard.jsx` |
| Evaluation (financial health) | `src/pages/Evaluation.jsx`, `src/utils/evaluationMetrics.js` |
| Shared tables | `src/components/DataTable.jsx` (pagination built-in) |
| Date filters | `src/hooks/useDateFilter.js`, `src/components/DateFilterControls.jsx` |
| Money formulas | `src/utils/transactionNet.js`, `src/utils/availableBalance.js` |
| Expense CSV import | `src/utils/csvExpenseImport.js`, `src/components/ImportExpensesModal.jsx` |
| Transaction CSV import | `src/utils/csvTransactionImport.js`, `src/components/ImportTransactionsModal.jsx` |
| Routes / nav | `src/App.jsx`, `src/components/Sidebar.jsx` |

## Domain rules (do not reinvent)

- **Gross** = sum of approved transaction `amount`.
- **Inward** = net after brokerage, additional charges, and impact fund (`transactionNetAfterImpactFund`).
- **Available** = Gross − Total Deductions − Total Expense (same as Inward − expenses; skip mirrored monthly brokerage expenses — see `sumExpenseAmountsForAvailable`).
- **Evaluation** labels must stay plain: Revenue growth (month-over-month / year-over-year), Gross margin, Net margin, Cash flow, Runway (months of expenses covered). Metrics use the **last complete month** (e.g. Sep when today is in Oct) so in-progress months are excluded.
- **Receivables aging** is not supported — FinHub has received transactions only, not unpaid invoices/due dates. Do not fake aging cards.

## Coding habits

- Match existing components (`StatCard`, `PageHeader`, `FilterBar`, `Modal`) instead of new UI systems.
- Prefer small utils under `src/utils/` for money/date logic; keep pages thin.
- Forms: use `required` on critical fields via `FormModal` field config.
- Expense types: builtins in `src/constants/expenseTypes.js`; CSV type detection in `csvExpenseImport.js` (keyword + word match; never auto-force General).
- Don’t commit unless asked. Don’t edit plan files unless asked.
- After substantive UI/logic changes, keep copy user-facing and simple.

## Commands

```bash
npm run dev
npm run build
npm run lint
graphify query "<question>"
graphify update .
```
