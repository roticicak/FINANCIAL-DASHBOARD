import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CATEGORY_COLORS } from '../../types/finance';
import { formatMoney, formatShortDate } from '../../utils/finance';
import { SpotlightCard } from '../ui/SpotlightCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { SegmentedControl } from '../ui/SegmentedControl';

export const CashFlowView: React.FC = () => {
  const {
    entries,
    currency,
    openAddModal,
    openEditModal,
    openPnLReportModal,
    deleteEntry,
  } = useFinance();

  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const cashFlowEntries = useMemo(
    () => entries.filter((e) => e.type === 'income' || e.type === 'expense'),
    [entries]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    cashFlowEntries.forEach((e) => set.add(e.category));
    return ['ALL', ...Array.from(set).sort()];
  }, [cashFlowEntries]);

  const filtered = useMemo(() => {
    return cashFlowEntries
      .filter((e) => {
        if (filterType !== 'all' && e.type !== filterType) return false;
        if (selectedCategory !== 'ALL' && e.category !== selectedCategory)
          return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            e.title.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q) ||
            (e.notes || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [cashFlowEntries, filterType, selectedCategory, search]);

  const totals = useMemo(() => {
    const income = cashFlowEntries
      .filter((e) => e.type === 'income')
      .reduce((s, e) => s + e.amount, 0);
    const expense = cashFlowEntries
      .filter((e) => e.type === 'expense')
      .reduce((s, e) => s + e.amount, 0);
    const expensePnL = cashFlowEntries
      .filter((e) => e.type === 'expense' && e.pnlTracked)
      .reduce((s, e) => s + (e.pnlAmount || 0), 0);
    return { income, expense, net: income - expense, expensePnL };
  }, [cashFlowEntries]);

  const topExpenseCategories = useMemo(() => {
    const map: Record<string, number> = {};
    cashFlowEntries
      .filter((e) => e.type === 'expense')
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [cashFlowEntries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Income &amp; Expense Manager
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">
            Cash Flow Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Log every income inflow and expense, and click{' '}
            <span className="font-semibold text-sky-600">Report P&amp;L</span> on any expense to track its profit or loss.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openAddModal('income')}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/25 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Income
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openAddModal('expense')}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-500/25 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </motion.button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SpotlightCard accent="emerald" className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Income
          </p>
          <AnimatedNumber
            value={totals.income}
            currency={currency}
            className="mt-2 block text-2xl sm:text-3xl font-extrabold text-emerald-600"
          />
          <p className="mt-1 text-xs text-slate-400">
            {cashFlowEntries.filter((e) => e.type === 'income').length} inflow records
          </p>
        </SpotlightCard>

        <SpotlightCard accent="rose" className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Expenses
          </p>
          <AnimatedNumber
            value={totals.expense}
            currency={currency}
            className="mt-2 block text-2xl sm:text-3xl font-extrabold text-rose-600"
          />
          <p className="mt-1 text-xs text-slate-400">
            Expense P&amp;L:{' '}
            <span
              className={`font-mono-num font-bold ${
                totals.expensePnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatMoney(totals.expensePnL, currency, { showSign: true })}
            </span>
          </p>
        </SpotlightCard>

        <SpotlightCard accent="blue" className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Net Cash Surplus
          </p>
          <AnimatedNumber
            value={totals.net}
            currency={currency}
            showSign
            className={`mt-2 block text-2xl sm:text-3xl font-extrabold ${
              totals.net >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          />
          <p className="mt-1 text-xs text-slate-400">
            {totals.income > 0
              ? `${((totals.net / totals.income) * 100).toFixed(1)}% operating margin`
              : 'Add income to see margin'}
          </p>
        </SpotlightCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Interactive Ledger Table */}
        <div className="lg:col-span-8">
          <SpotlightCard accent="neutral" interactive={false} className="p-5">
            {/* Filter Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SegmentedControl
                layoutId="cashflow-type-filter"
                size="sm"
                activeTone="dark"
                value={filterType}
                onChange={setFilterType}
                options={[
                  { value: 'all', label: 'All', badge: cashFlowEntries.length },
                  {
                    value: 'income',
                    label: 'Income',
                    badge: cashFlowEntries.filter((e) => e.type === 'income').length,
                  },
                  {
                    value: 'expense',
                    label: 'Expenses',
                    badge: cashFlowEntries.filter((e) => e.type === 'expense').length,
                  },
                ]}
              />

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-52">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-8 pr-3 text-xs font-medium text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-8 pr-3 text-xs font-semibold text-slate-700 focus:border-emerald-400 focus:bg-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c === 'ALL' ? 'All Categories' : c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Rows */}
            <div className="mt-4 divide-y divide-slate-100">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center text-sm text-slate-400"
                  >
                    No matching transactions found.
                  </motion.div>
                ) : (
                  filtered.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                      className="group flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3.5 px-2 -mx-2 rounded-2xl hover:bg-slate-50/90 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                            item.type === 'income'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.type === 'income' ? (
                            <ArrowDownLeft className="h-4.5 w-4.5" />
                          ) : (
                            <ArrowUpRight className="h-4.5 w-4.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-sm text-slate-900 truncate">
                              {item.title}
                            </p>
                            {item.pnlTracked && typeof item.pnlAmount === 'number' && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  item.pnlAmount >= 0
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                <TrendingUp className="h-2.5 w-2.5" />
                                P&amp;L{' '}
                                {formatMoney(item.pnlAmount, currency, {
                                  showSign: true,
                                })}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            <span className="font-semibold text-slate-600">
                              {item.category}
                            </span>{' '}
                            · {formatShortDate(item.date)}
                            {item.notes ? ` · ${item.notes}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pl-13 sm:pl-0 shrink-0">
                        <span
                          className={`font-mono-num text-sm font-extrabold ${
                            item.type === 'income'
                              ? 'text-emerald-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {item.type === 'income' ? '+' : '-'}
                          {formatMoney(item.amount, currency)}
                        </span>

                        <div className="flex items-center gap-1">
                          {item.type === 'expense' && (
                            <button
                              type="button"
                              onClick={() => openPnLReportModal(item)}
                              title="Report Profit or Loss on this expense"
                              className="flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
                            >
                              <TrendingUp className="h-3 w-3" />
                              P&amp;L
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Edit entry"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEntry(item.id)}
                            title="Delete entry"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </SpotlightCard>
        </div>

        {/* Category Breakdown Rail */}
        <div className="lg:col-span-4 space-y-5">
          <SpotlightCard accent="rose" interactive={false} className="p-5">
            <h3 className="font-display text-base font-extrabold text-slate-900">
              Top Expense Categories
            </h3>
            <p className="text-xs text-slate-500">
              Share of total operating spend
            </p>
            <div className="mt-4 space-y-3.5">
              {topExpenseCategories.length === 0 ? (
                <p className="text-xs text-slate-400">No expenses logged yet.</p>
              ) : (
                topExpenseCategories.map(([cat, amt]) => {
                  const pct =
                    totals.expense > 0 ? (amt / totals.expense) * 100 : 0;
                  const color = CATEGORY_COLORS[cat] || '#F43F5E';
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{cat}</span>
                        <span className="font-mono-num font-bold text-slate-900">
                          {formatMoney(amt, currency)}{' '}
                          <span className="text-slate-400 font-normal">
                            ({pct.toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, pct)}%` }}
                          transition={{
                            type: 'spring',
                            stiffness: 180,
                            damping: 26,
                          }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SpotlightCard>

          <SpotlightCard accent="blue" className="p-5">
            <h3 className="font-display text-base font-extrabold text-slate-900">
              Pro Tip: Expense P&amp;L
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Running ads, buying inventory to flip, or funding a side project? Click the{' '}
              <span className="font-bold text-sky-700">P&amp;L</span> button on any expense row to report its revenue recovery, profit, or loss — it flows straight into your P&amp;L Reports and Weekly/Monthly Summaries.
            </p>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
};
