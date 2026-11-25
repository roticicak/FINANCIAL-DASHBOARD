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
} from 'recharts';
import {
  CalendarRange,
  Download,
  Printer,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Landmark,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  exportEntriesToCSV,
  formatMoney,
  formatShortDate,
  getMonthlySummaries,
  getWeeklySummaries,
} from '../../utils/finance';
import { SpotlightCard } from '../ui/SpotlightCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { SegmentedControl } from '../ui/SegmentedControl';

const GRADE_STYLE: Record<string, string> = {
  'A+': 'from-emerald-500 to-teal-500 shadow-emerald-500/30',
  A: 'from-emerald-500 to-green-500 shadow-emerald-500/25',
  'B+': 'from-sky-500 to-blue-600 shadow-sky-500/25',
  B: 'from-amber-500 to-orange-500 shadow-amber-500/25',
  C: 'from-rose-500 to-pink-600 shadow-rose-500/25',
};

export const SummariesView: React.FC = () => {
  const { entries, currency } = useFinance();
  const [periodMode, setPeriodMode] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const weeklySummaries = useMemo(() => getWeeklySummaries(entries), [entries]);
  const monthlySummaries = useMemo(
    () => getMonthlySummaries(entries),
    [entries]
  );

  const summaries =
    periodMode === 'weekly' ? weeklySummaries : monthlySummaries;

  const safeIndex = Math.min(selectedIndex, Math.max(0, summaries.length - 1));
  const current = summaries[safeIndex];
  const previous = summaries[safeIndex + 1] || null;

  const handleModeChange = (next: 'weekly' | 'monthly') => {
    setPeriodMode(next);
    setSelectedIndex(0);
  };

  const deltaCash = previous
    ? current.netCashFlow - previous.netCashFlow
    : null;
  const deltaPnL = previous ? current.netPnL - previous.netPnL : null;

  if (!current) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center">
        <p className="text-base font-bold text-slate-700">
          Add entries to unlock Weekly &amp; Monthly Summaries
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <CalendarRange className="h-3.5 w-3.5" />
            Automated End-of-Week &amp; Monthly Closings
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">
            {periodMode === 'weekly' ? 'Weekly Summary' : 'Monthly Summary'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review closing cash flow, investment pace, P&amp;L performance, and automated insights for every period.
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2.5">
          <SegmentedControl
            layoutId="summary-period-mode"
            activeTone="emerald"
            value={periodMode}
            onChange={handleModeChange}
            options={[
              {
                value: 'weekly',
                label: 'Weekly Summary',
                badge: weeklySummaries.length,
              },
              {
                value: 'monthly',
                label: 'Monthly Summary',
                badge: monthlySummaries.length,
              },
            ]}
          />
          <button
            type="button"
            onClick={() =>
              exportEntriesToCSV(
                current.entries,
                `verdant-${periodMode}-${current.key}.csv`
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-sky-300 hover:text-sky-700 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Period Selector Rail */}
      <div className="no-print flex items-center gap-2">
        <button
          type="button"
          disabled={safeIndex >= summaries.length - 1}
          onClick={() =>
            setSelectedIndex((i) => Math.min(summaries.length - 1, i + 1))
          }
          title="Older period"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1">
          {summaries.map((s, idx) => {
            const active = idx === safeIndex;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative shrink-0 rounded-2xl border px-4 py-2.5 text-left transition-all cursor-pointer ${
                  active
                    ? 'border-emerald-400 bg-white shadow-md shadow-emerald-500/10'
                    : 'border-slate-200/80 bg-white/60 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-extrabold ${
                      active ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    {s.shortLabel}
                  </span>
                  <span
                    className={`rounded-md bg-gradient-to-br px-1.5 py-0.5 text-[10px] font-extrabold text-white ${
                      GRADE_STYLE[s.healthGrade]
                    }`}
                  >
                    {s.healthGrade}
                  </span>
                </div>
                <p className="font-mono-num mt-0.5 text-[11px] font-semibold text-slate-500">
                  Net{' '}
                  <span
                    className={
                      s.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }
                  >
                    {formatMoney(s.netCashFlow, currency, {
                      compact: true,
                      showSign: true,
                    })}
                  </span>
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={safeIndex <= 0}
          onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
          title="Newer period"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Animated Period Report Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${periodMode}-${current.key}`}
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="space-y-5"
        >
          {/* Period Hero Closing Card */}
          <SpotlightCard accent="emerald" interactive={false} className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${
                    GRADE_STYLE[current.healthGrade]
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase opacity-80">
                    Grade
                  </span>
                  <span className="font-display text-2xl font-extrabold leading-none">
                    {current.healthGrade}
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      {periodMode === 'weekly'
                        ? 'End-of-Week Close'
                        : 'Monthly Closing Report'}
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {current.healthLabel}
                    </span>
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-extrabold text-slate-900">
                    {current.label}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {current.entryCount} ledger transactions recorded · Savings
                    rate{' '}
                    <span className="font-mono-num font-bold text-slate-800">
                      {current.savingsRate.toFixed(1)}%
                    </span>
                    {' · '}Investment rate{' '}
                    <span className="font-mono-num font-bold text-amber-600">
                      {current.investmentRate.toFixed(1)}%
                    </span>
                  </p>
                </div>
              </div>

              {/* Delta Comparison Pills */}
              <div className="flex flex-wrap gap-2.5">
                {deltaCash !== null && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-2.5">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      vs Prior {periodMode === 'weekly' ? 'Week' : 'Month'} Cash Flow
                    </p>
                    <p
                      className={`font-mono-num mt-0.5 flex items-center gap-1 text-sm font-extrabold ${
                        deltaCash >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {deltaCash >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {formatMoney(deltaCash, currency, { showSign: true })}
                    </p>
                  </div>
                )}
                {deltaPnL !== null && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-2.5">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      vs Prior {periodMode === 'weekly' ? 'Week' : 'Month'} P&amp;L
                    </p>
                    <p
                      className={`font-mono-num mt-0.5 flex items-center gap-1 text-sm font-extrabold ${
                        deltaPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {deltaPnL >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {formatMoney(deltaPnL, currency, { showSign: true })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 5-Metric Closing Grid */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                <p className="text-[11px] font-bold uppercase text-emerald-700">
                  Income
                </p>
                <AnimatedNumber
                  value={current.income}
                  currency={currency}
                  className="mt-1 block text-lg font-extrabold text-emerald-900"
                />
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5">
                <p className="text-[11px] font-bold uppercase text-rose-700">
                  Expenses
                </p>
                <AnimatedNumber
                  value={current.expenses}
                  currency={currency}
                  className="mt-1 block text-lg font-extrabold text-rose-900"
                />
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5">
                <p className="text-[11px] font-bold uppercase text-amber-800">
                  Investments
                </p>
                <AnimatedNumber
                  value={current.investments}
                  currency={currency}
                  className="mt-1 block text-lg font-extrabold text-amber-900"
                />
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3.5">
                <p className="text-[11px] font-bold uppercase text-sky-700">
                  Net Cash Flow
                </p>
                <AnimatedNumber
                  value={current.netCashFlow}
                  currency={currency}
                  showSign
                  className={`mt-1 block text-lg font-extrabold ${
                    current.netCashFlow >= 0 ? 'text-sky-900' : 'text-rose-700'
                  }`}
                />
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  Reported Net P&amp;L
                </p>
                <AnimatedNumber
                  value={current.netPnL}
                  currency={currency}
                  showSign
                  className={`mt-1 block text-lg font-extrabold ${
                    current.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                />
              </div>
            </div>
          </SpotlightCard>

          {/* Breakdown Chart + Executive Digest */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <SpotlightCard accent="blue" interactive={false} className="p-6 h-full">
                <h3 className="font-display text-base font-extrabold text-slate-900">
                  {periodMode === 'weekly'
                    ? 'Day-by-Day Activity (Mon – Sun)'
                    : 'Week-by-Week Monthly Pace'}
                </h3>
                <p className="text-xs text-slate-500">
                  Income, expenses, and investments across {current.label}
                </p>

                <div className="mt-5 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={current.breakdownBuckets}
                      margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#E2E8F0"
                      />
                      <XAxis
                        dataKey="label"
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
                      <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md">
                              <p className="mb-1 text-xs font-extrabold text-slate-900">
                                {label}
                              </p>
                              {payload.map((p, idx) => (
                                <div
                                  key={`${String(p.dataKey)}-${idx}`}
                                  className="flex items-center justify-between gap-4 text-xs"
                                >
                                  <span className="flex items-center gap-1.5 text-slate-600">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: p.color }}
                                    />
                                    {p.name}
                                  </span>
                                  <span className="font-mono-num font-bold text-slate-900">
                                    {formatMoney(Number(p.value || 0), currency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="income"
                        name="Income"
                        fill="#10B981"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Expenses"
                        fill="#F43F5E"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="investments"
                        name="Investments"
                        fill="#F59E0B"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SpotlightCard>
            </div>

            {/* Automated Executive Digest */}
            <div className="lg:col-span-5">
              <SpotlightCard accent="emerald" interactive={false} className="p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-extrabold text-slate-900">
                        Executive Financial Digest
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Auto-generated takeaways for {current.shortLabel}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5">
                    {current.insights.length === 0 ? (
                      <li className="text-xs text-slate-500">
                        Add entries during this period to generate insights.
                      </li>
                    ) : (
                      current.insights.map((ins, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-700"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <span>{ins}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {/* Highlights footer */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-4">
                  <div className="rounded-xl bg-rose-50/60 p-2.5 border border-rose-100">
                    <p className="text-[10px] font-bold uppercase text-rose-600">
                      Top Expense Area
                    </p>
                    <p className="mt-0.5 truncate text-xs font-extrabold text-slate-900">
                      {current.topExpenseCategory?.category || 'None'}
                    </p>
                    {current.topExpenseCategory && (
                      <p className="font-mono-num text-[11px] font-bold text-rose-700">
                        {formatMoney(current.topExpenseCategory.amount, currency)}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl bg-emerald-50/60 p-2.5 border border-emerald-100">
                    <p className="text-[10px] font-bold uppercase text-emerald-700">
                      Biggest P&amp;L Mover
                    </p>
                    <p className="mt-0.5 truncate text-xs font-extrabold text-slate-900">
                      {current.topPnLItem?.title || 'None'}
                    </p>
                    {current.topPnLItem && (
                      <p
                        className={`font-mono-num text-[11px] font-bold ${
                          (current.topPnLItem.pnlAmount || 0) >= 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {formatMoney(current.topPnLItem.pnlAmount || 0, currency, {
                          showSign: true,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </SpotlightCard>
            </div>
          </div>

          {/* Itemized Period Statement */}
          <SpotlightCard accent="neutral" interactive={false} className="p-6">
            <h3 className="font-display text-base font-extrabold text-slate-900">
              Itemized Statement · {current.label}
            </h3>
            <div className="mt-3 divide-y divide-slate-100">
              {current.entries.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  No entries recorded in this period.
                </p>
              ) : (
                [...current.entries]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-3 py-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            e.type === 'income'
                              ? 'bg-emerald-100 text-emerald-700'
                              : e.type === 'investment'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {e.type === 'income' ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : e.type === 'investment' ? (
                            <Landmark className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">
                            {e.title}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {e.category} · {formatShortDate(e.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`font-mono-num font-extrabold ${
                            e.type === 'income'
                              ? 'text-emerald-600'
                              : e.type === 'investment'
                                ? 'text-amber-600'
                                : 'text-slate-900'
                          }`}
                        >
                          {e.type === 'income' ? '+' : '-'}
                          {formatMoney(e.amount, currency)}
                        </p>
                        {e.pnlTracked && typeof e.pnlAmount === 'number' && (
                          <p
                            className={`font-mono-num text-[10px] font-bold ${
                              e.pnlAmount >= 0
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            P&amp;L{' '}
                            {formatMoney(e.pnlAmount, currency, {
                              showSign: true,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </SpotlightCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
