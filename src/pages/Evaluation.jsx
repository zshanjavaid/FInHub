import { lazy, Suspense, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiActivity, FiTrendingUp, FiPercent, FiClock } from 'react-icons/fi';
import { fetchTransactions } from '../store/transactions/transactionsSlice';
import { fetchExpenses } from '../store/expenses/expensesSlice';
import { formatMoney, signedMoneyClass } from '../utils/format';
import { buildEvaluationSnapshot } from '../utils/evaluationMetrics';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import StatCard from '../components/StatCard';
import ErrorAlert from '../components/ErrorAlert';
import DeferredMount, { ChartSkeleton } from '../components/DeferredMount';

const BarChart = lazy(() => import('../components/BarChart'));

const formatPct = (pct) => {
  if (pct == null || !Number.isFinite(pct)) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}%`;
};

const Evaluation = () => {
  usePrivacyHidden();
  const dispatch = useDispatch();
  const transactions = useSelector((state) => state.transactions.items);
  const expenses = useSelector((state) => state.expenses.items);
  const transactionsError = useSelector((state) => state.transactions.error);
  const expensesError = useSelector((state) => state.expenses.error);

  useEffect(() => {
    document.title = 'Evaluation | FinHub';
  }, []);

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchExpenses());
  }, [dispatch]);

  const snapshot = useMemo(
    () => buildEvaluationSnapshot(transactions, expenses),
    [transactions, expenses]
  );

  const { asOfLabel, growth, margins, cashFlow, runway, fragileMargin } = snapshot;

  const chartSeries = useMemo(
    () => [
      { label: 'Money in', values: cashFlow.inflow, color: '#0d9488' },
      { label: 'Money out', values: cashFlow.outflow, color: '#ef4444' }
    ],
    [cashFlow]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Evaluation"
        subtitle={`Financial health · ${asOfLabel}`}
      />

      <ErrorAlert messages={[transactionsError, expensesError].filter(Boolean)} />

      {(fragileMargin || runway.fragile) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Needs attention</p>
          <ul className="mt-1 list-disc pl-5 space-y-0.5 text-amber-800">
            {fragileMargin ? (
              <li>
                Gross margin is under 40% ({formatPct(margins.grossMarginPct)}). Example: 40% gross
                margin with thin cash cover is a fragile position.
              </li>
            ) : null}
            {runway.fragile ? (
              <li>
                Runway is under 2 months
                {runway.months != null ? ` (${runway.months} months of expenses covered)` : ''}.
              </li>
            ) : null}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          label="Revenue growth (month-over-month)"
          calculation={
            <div className="space-y-2">
              <p>Last complete month’s revenue compared to the month before (gross from approved transactions).</p>
              <ul className="space-y-1 tabular-nums font-mono">
                <li className="flex justify-between gap-4">
                  <span>{growth.mom.currentLabel}</span>
                  <span className="font-semibold">{formatMoney(growth.mom.current)}</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>{growth.mom.previousLabel}</span>
                  <span className="font-semibold">{formatMoney(growth.mom.previous)}</span>
                </li>
              </ul>
            </div>
          }
          value={formatPct(growth.mom.pct)}
          icon={<FiTrendingUp className="w-5 h-5" />}
          valueClassName={
            growth.mom.pct == null
              ? 'text-slate-500'
              : growth.mom.pct >= 0
                ? 'text-primary-600'
                : 'text-red-600'
          }
          iconClassName="text-primary-600"
          borderClassName="border-t-primary-600"
          hint={
            <p className="text-xs font-light text-slate-500 truncate">
              {formatMoney(growth.mom.current)} vs {formatMoney(growth.mom.previous)}
            </p>
          }
        />

        <StatCard
          label="Revenue growth (year-over-year)"
          calculation={
            <div className="space-y-2">
              <p>Year-to-date through the last complete month, compared to the same period last year.</p>
              <ul className="space-y-1 tabular-nums font-mono">
                <li className="flex justify-between gap-4">
                  <span>{growth.yoy.currentLabel}</span>
                  <span className="font-semibold">{formatMoney(growth.yoy.current)}</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>{growth.yoy.previousLabel}</span>
                  <span className="font-semibold">{formatMoney(growth.yoy.previous)}</span>
                </li>
              </ul>
            </div>
          }
          value={formatPct(growth.yoy.pct)}
          icon={<FiActivity className="w-5 h-5" />}
          valueClassName={
            growth.yoy.pct == null
              ? 'text-slate-500'
              : growth.yoy.pct >= 0
                ? 'text-teal-700'
                : 'text-red-600'
          }
          iconClassName="text-teal-600"
          iconWrapClassName="bg-teal-50 ring-1 ring-teal-100/80"
          borderClassName="border-t-teal-500"
          hint={
            <p className="text-xs font-light text-slate-500 truncate">
              {formatMoney(growth.yoy.current)} vs {formatMoney(growth.yoy.previous)}
            </p>
          }
        />

        <StatCard
          label="Gross margin"
          calculation={
            <div className="space-y-2">
              <p>
                Inward ÷ Gross × 100 (last 12 complete months). Inward is revenue after brokerage, extra
                charges, and impact fund — before other expenses.
              </p>
              <ul className="space-y-1 tabular-nums font-mono">
                <li className="flex justify-between gap-4">
                  <span>Inward</span>
                  <span className="font-semibold">{formatMoney(margins.inward)}</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>Gross</span>
                  <span className="font-semibold">{formatMoney(margins.gross)}</span>
                </li>
              </ul>
            </div>
          }
          value={margins.grossMarginPct != null ? `${margins.grossMarginPct}%` : '—'}
          icon={<FiPercent className="w-5 h-5" />}
          valueClassName={fragileMargin ? 'text-amber-800' : 'text-violet-700'}
          iconClassName={fragileMargin ? 'text-amber-600' : 'text-violet-600'}
          iconWrapClassName={
            fragileMargin
              ? 'bg-amber-50 ring-1 ring-amber-100/80'
              : 'bg-violet-50 ring-1 ring-violet-100/80'
          }
          borderClassName={fragileMargin ? 'border-t-amber-500' : 'border-t-violet-500'}
        />

        <StatCard
          label="Net margin"
          calculation={
            <div className="space-y-2">
              <p>Available ÷ Gross × 100 over the last 12 complete months. Available = Inward − Expense.</p>
              <ul className="space-y-1 tabular-nums font-mono">
                <li className="flex justify-between gap-4">
                  <span>Available</span>
                  <span className={`font-semibold ${signedMoneyClass(margins.available)}`}>
                    {formatMoney(margins.available)}
                  </span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>Gross</span>
                  <span className="font-semibold">{formatMoney(margins.gross)}</span>
                </li>
              </ul>
            </div>
          }
          value={margins.netMarginPct != null ? `${margins.netMarginPct}%` : '—'}
          icon={<FiPercent className="w-5 h-5" />}
          valueClassName={
            margins.netMarginPct != null && margins.netMarginPct < 0 ? 'text-red-600' : 'text-slate-800'
          }
          iconClassName="text-slate-600"
          iconWrapClassName="bg-slate-100 ring-1 ring-slate-200/80"
          borderClassName="border-t-slate-500"
        />

        <StatCard
          label="Runway"
          calculation={
            <div className="space-y-2">
              <p>
                Months of expenses covered: Available ÷ average monthly expenses (last 3 complete months).
                Based on FinHub Available Amount, not bank cash.
              </p>
              <ul className="space-y-1 tabular-nums font-mono">
                <li className="flex justify-between gap-4">
                  <span>Available</span>
                  <span className={`font-semibold ${signedMoneyClass(runway.available)}`}>
                    {formatMoney(runway.available)}
                  </span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>Avg monthly expenses</span>
                  <span className="font-semibold">{formatMoney(runway.avgMonthlyExpense)}</span>
                </li>
              </ul>
            </div>
          }
          value={runway.months != null ? `${runway.months} months` : '—'}
          icon={<FiClock className="w-5 h-5" />}
          valueClassName={runway.fragile ? 'text-amber-800' : 'text-sky-700'}
          iconClassName={runway.fragile ? 'text-amber-600' : 'text-sky-600'}
          iconWrapClassName={
            runway.fragile
              ? 'bg-amber-50 ring-1 ring-amber-100/80'
              : 'bg-sky-50 ring-1 ring-sky-100/80'
          }
          borderClassName={runway.fragile ? 'border-t-amber-500' : 'border-t-sky-500'}
          hint={
            <p className="text-xs font-light text-slate-500">Months of expenses covered</p>
          }
        />

        <StatCard
          label="Cash flow (12 months)"
          calculation={
            <div className="space-y-2">
              <p>Money in minus money out over the last 12 complete months (see chart below for each month).</p>
              <ul className="space-y-1 tabular-nums font-mono">
                <li className="flex justify-between gap-4">
                  <span>Money in</span>
                  <span className="font-semibold">
                    {formatMoney(cashFlow.inflow.reduce((s, v) => s + v, 0))}
                  </span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>Money out</span>
                  <span className="font-semibold">
                    {formatMoney(cashFlow.outflow.reduce((s, v) => s + v, 0))}
                  </span>
                </li>
              </ul>
            </div>
          }
          value={formatMoney(cashFlow.net.reduce((s, v) => s + v, 0))}
          icon={<FiActivity className="w-5 h-5" />}
          valueClassName={signedMoneyClass(cashFlow.net.reduce((s, v) => s + v, 0))}
          iconClassName="text-primary-600"
          borderClassName="border-t-primary-600"
          hint={<p className="text-xs font-light text-slate-500">Net over last 12 complete months</p>}
        />
      </div>

      <DeferredMount>
        <Suspense fallback={<ChartSkeleton />}>
          <div className="min-w-0">
            <BarChart
              data={chartSeries}
              labels={cashFlow.labels}
              title="Cash flow"
            />
          </div>
        </Suspense>
      </DeferredMount>
    </PageContainer>
  );
};

export default Evaluation;
