import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Sparkles,
  Scale,
  ArrowUpRight,
  Landmark,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatMoney, formatShortDate } from '../../utils/finance';
import { SpotlightCard } from '../ui/SpotlightCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { SegmentedControl } from '../ui/SegmentedControl';

type PnLFilter = 'all' | 'expense' | 'investment' | 'profit' | 'loss';

export const PnLView: React.FC = () => {
  const { entries, currency, openAddModal, openPnLReportModal } = useFinance();
  const [filter, setFilter] = useState<PnLFilter>('all');

  const trackedItems = useMemo(
    () =>
      entries
        .filter((e) => e.pnlTracked && typeof e.pnlAmount === 'number')
        .sort(
          (a, b) =>
            (b.pnlUpdatedAt || b.date).localeCompare(a.pnlUpdatedAt || a.date)
        ),
    [entries]
  );

  const untrackedExpenses = useMemo(
    () =>
      entries
        .filter((e) => e.type === 'expense' && !e.pnlTracked)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [entries]
  );

  const filtered = useMemo(() => {
    return trackedItems.filter((item) => {
      if (filter === 'expense') return item.type === 'expense';
      if (filter === 'investment') return item.type === 'investment';
      if (filter === 'profit') return (item.pnlAmount || 0) > 0;
      if (filter === 'loss') return (item.pnlAmount || 0) < 0;
      return true;
    });
  }, [trackedItems, filter]);

  const summary = useMemo(() => {
    const totalProfit = trackedItems
      .filter((e) => (e.pnlAmount || 0) > 0)
      .reduce((s, e) => s + (e.pnlAmount || 0), 0);
    const totalLoss = trackedItems
      .filter((e) => (e.pnlAmount || 0) < 0)
      .reduce((s, e) => s + Math.abs(e.pnlAmount || 0), 0);
    const netPnL = totalProfit - totalLoss;
    const totalCostBasis = trackedItems.reduce((s, e) => s + e.amount, 0);
    const overallROI =
      totalCostBasis > 0 ? (netPnL / totalCostBasis) * 100 : 0;

    const expenseNetPnL = trackedItems
      .filter((e) => e.type === 'expense')
      .reduce((s, e) => s + (e.pnlAmount || 0), 0);
    const investNetPnL = trackedItems
      .filter((e) => e.type === 'investment')
      .reduce((s, e) => s + (e.pnlAmount || 0), 0);

    return {
      totalProfit,
      totalLoss,
      netPnL,
      totalCostBasis,
      overallROI,
      expenseNetPnL,
      investNetPnL,
    };
  }, [trackedItems]);

  const chartData = useMemo(
    () =>
      filtered.slice(0, 10).map((item) => ({
        name:
          item.ticker ||
          (item.title.length > 16 ? `${item.title.slice(0, 15)}…` : item.title),
        fullTitle: item.title,
        pnl: Number((item.pnlAmount || 0).toFixed(2)),
        cost: item.amount,
        type: item.type,
      })),
    [filtered]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            <Scale className="h-3.5 w-3.5" />
            Expense &amp; Investment Profit / Loss Studio
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">
            Profit &amp; Loss Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Report profits or losses directly on any expense or investment to see true ROI and net performance.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => openAddModal('pnl')}
          className="btn-shimmer relative overflow-hidden flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/25 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" /> Report Profit / Loss
        </motion.button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SpotlightCard accent="emerald" className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Gross Profits
            </p>
            <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <AnimatedNumber
            value={summary.totalProfit}
            currency={currency}
            showSign
            className="mt-2 block text-2xl sm:text-3xl font-extrabold text-emerald-600"
          />
          <p className="mt-1 text-xs text-slate-400">
            From {trackedItems.filter((e) => (e.pnlAmount || 0) > 0).length} profitable items
          </p>
        </SpotlightCard>

        <SpotlightCard accent="rose" className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Gross Losses
            </p>
            <TrendingDown className="h-4.5 w-4.5 text-rose-500" />
          </div>
          <AnimatedNumber
            value={-summary.totalLoss}
            currency={currency}
            className="mt-2 block text-2xl sm:text-3xl font-extrabold text-rose-600"
          />
          <p className="mt-1 text-xs text-slate-400">
            From {trackedItems.filter((e) => (e.pnlAmount || 0) < 0).length} losing items
          </p>
        </SpotlightCard>

        <SpotlightCard
          accent={summary.netPnL >= 0 ? 'emerald' : 'rose'}
          className="p-5"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Net Profit / Loss
          </p>
          <AnimatedNumber
            value={summary.netPnL}
            currency={currency}
            showSign
            className={`mt-2 block text-2xl sm:text-3xl font-extrabold ${
              summary.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          />
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Blended ROI:{' '}
            <span
              className={`font-mono-num ${
                summary.overallROI >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {summary.overallROI >= 0 ? '+' : ''}
              {summary.overallROI.toFixed(1)}%
            </span>
          </p>
        </SpotlightCard>

        <SpotlightCard accent="blue" className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            P&amp;L Split
          </p>
          <div className="mt-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Expense P&amp;L</span>
              <span
                className={`font-mono-num font-extrabold ${
                  summary.expenseNetPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatMoney(summary.expenseNetPnL, currency, { showSign: true })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Investment P&amp;L</span>
              <span
                className={`font-mono-num font-extrabold ${
                  summary.investNetPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatMoney(summary.investNetPnL, currency, { showSign: true })}
              </span>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Diverging Profit vs Loss Chart */}
      <SpotlightCard accent="blue" interactive={false} className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-900">
              Profit vs. Loss Breakdown
            </h2>
            <p className="text-xs text-slate-500">
              Visual comparison of winning vs. losing expenses and investments
            </p>
          </div>
          <SegmentedControl
            layoutId="pnl-filter-tabs"
            size="sm"
            activeTone="blue"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'expense', label: 'Expense P&L' },
              { value: 'investment', label: 'Investment P&L' },
              { value: 'profit', label: 'Profits' },
              { value: 'loss', label: 'Losses' },
            ]}
          />
        </div>

        <div className="mt-5 h-68 w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No P&amp;L reports in this filter yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 12, left: -8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#E2E8F0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={(v) =>
                    formatMoney(v, currency, { compact: true })
                  }
                />
                <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1.5} />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const isPos = d.pnl >= 0;
                    return (
                      <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md">
                        <p className="text-xs font-extrabold text-slate-900">
                          {d.fullTitle}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 capitalize">
                          {d.type} · Cost {formatMoney(d.cost, currency)}
                        </p>
                        <p
                          className={`font-mono-num mt-1.5 text-sm font-extrabold ${
                            isPos ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatMoney(d.pnl, currency, { showSign: true })}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="pnl" radius={[8, 8, 8, 8]} maxBarSize={44}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`bar-${idx}`}
                      fill={entry.pnl >= 0 ? '#10B981' : '#F43F5E'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SpotlightCard>

      {/* P&L Ledger + Quick-Report Unassigned Expenses */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Tracked P&L Table */}
        <div className="lg:col-span-8">
          <SpotlightCard accent="neutral" interactive={false} className="p-5">
            <h3 className="font-display text-base font-extrabold text-slate-900">
              Reported Profit &amp; Loss Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Click &ldquo;Update P&amp;L&rdquo; on any row to adjust profit, loss, or realized status
            </p>

            <div className="mt-4 divide-y divide-slate-100">
              <AnimatePresence mode="popLayout">
                {filtered.map((item) => {
                  const pnl = item.pnlAmount || 0;
                  const isPos = pnl >= 0;
                  const roi = item.amount > 0 ? (pnl / item.amount) * 100 : 0;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3.5 px-2 -mx-2 rounded-2xl hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                            item.type === 'investment'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.type === 'investment' ? (
                            <Landmark className="h-4.5 w-4.5" />
                          ) : (
                            <ArrowUpRight className="h-4.5 w-4.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {item.title}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                item.pnlStatus === 'realized'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {item.pnlStatus === 'realized'
                                ? 'Realized'
                                : 'Unrealized'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Cost{' '}
                            <span className="font-mono-num font-semibold text-slate-700">
                              {formatMoney(item.amount, currency)}
                            </span>{' '}
                            → Value{' '}
                            <span className="font-mono-num font-semibold text-slate-700">
                              {formatMoney(
                                item.currentValue ?? item.amount + pnl,
                                currency
                              )}
                            </span>{' '}
                            · {formatShortDate(item.pnlUpdatedAt || item.date)}
                          </p>
                          {item.pnlNote && (
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {item.pnlNote}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0 shrink-0">
                        <div className="text-right">
                          <p
                            className={`font-mono-num text-sm font-extrabold ${
                              isPos ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatMoney(pnl, currency, { showSign: true })}
                          </p>
                          <p
                            className={`font-mono-num text-[11px] font-bold ${
                              isPos ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {roi >= 0 ? '+' : ''}
                            {roi.toFixed(1)}%
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openPnLReportModal(item)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-colors cursor-pointer"
                        >
                          Update P&amp;L
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </SpotlightCard>
        </div>

        {/* Quick-Assign P&L to Any Expense */}
        <div className="lg:col-span-4">
          <SpotlightCard accent="emerald" interactive={false} className="p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-extrabold text-slate-900">
                  Report P&amp;L on an Expense
                </h3>
                <p className="text-[11px] text-slate-500">
                  One-click profit/loss logging for recent expenses
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {untrackedExpenses.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500 text-center">
                  All your recent expenses already have P&amp;L reports attached!
                </p>
              ) : (
                untrackedExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 hover:border-sky-200 hover:bg-sky-50/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">
                        {exp.title}
                      </p>
                      <p className="font-mono-num text-[11px] text-slate-500">
                        Cost {formatMoney(exp.amount, currency)} ·{' '}
                        {formatShortDate(exp.date)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPnLReportModal(exp)}
                      className="shrink-0 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-sky-700 transition-colors cursor-pointer"
                    >
                      Report
                    </button>
                  </div>
                ))
              )}
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
};
