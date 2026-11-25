import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark,
  Plus,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  Award,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CATEGORY_COLORS } from '../../types/finance';
import { formatMoney, formatShortDate } from '../../utils/finance';
import { SpotlightCard } from '../ui/SpotlightCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { SegmentedControl } from '../ui/SegmentedControl';

export const InvestmentsView: React.FC = () => {
  const {
    entries,
    currency,
    openAddModal,
    openEditModal,
    openPnLReportModal,
    deleteEntry,
  } = useFinance();

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'realized'>(
    'all'
  );

  const investments = useMemo(
    () =>
      entries
        .filter((e) => e.type === 'investment')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  );

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return investments;
    return investments.filter((e) => (e.pnlStatus || 'open') === statusFilter);
  }, [investments, statusFilter]);

  const stats = useMemo(() => {
    const invested = investments.reduce((s, e) => s + e.amount, 0);
    const currentVal = investments.reduce(
      (s, e) => s + (e.currentValue ?? e.amount),
      0
    );
    const totalPnL = investments.reduce((s, e) => s + (e.pnlAmount || 0), 0);
    const roi = invested > 0 ? (totalPnL / invested) * 100 : 0;
    const winners = investments.filter((e) => (e.pnlAmount || 0) > 0).length;
    const winRate =
      investments.length > 0 ? (winners / investments.length) * 100 : 0;

    const byClass: Record<string, { invested: number; current: number }> = {};
    investments.forEach((e) => {
      const k = e.category;
      if (!byClass[k]) byClass[k] = { invested: 0, current: 0 };
      byClass[k].invested += e.amount;
      byClass[k].current += e.currentValue ?? e.amount;
    });

    const assetClasses = Object.entries(byClass)
      .map(([name, v]) => ({
        name,
        invested: v.invested,
        current: v.current,
        pnl: v.current - v.invested,
        color: CATEGORY_COLORS[name] || '#F59E0B',
      }))
      .sort((a, b) => b.current - a.current);

    return { invested, currentVal, totalPnL, roi, winRate, winners, assetClasses };
  }, [investments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            <Landmark className="h-3.5 w-3.5" />
            Investment Expenses &amp; Portfolio
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">
            Investment Capital Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Record every investment expense, monitor current valuation, and lock in realized profit or loss.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => openAddModal('investment')}
          className="btn-shimmer relative overflow-hidden flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/25 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" /> Add Investment Expense
        </motion.button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SpotlightCard accent="amber" className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Capital Invested
          </p>
          <AnimatedNumber
            value={stats.invested}
            currency={currency}
            className="mt-2 block text-2xl sm:text-3xl font-extrabold text-slate-900"
          />
          <p className="mt-1 text-xs text-slate-400">
            Across {investments.length} positions
          </p>
        </SpotlightCard>

        <SpotlightCard accent="blue" className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Current Portfolio Value
          </p>
          <AnimatedNumber
            value={stats.currentVal}
            currency={currency}
            className="mt-2 block text-2xl sm:text-3xl font-extrabold text-slate-900"
          />
          <p className="mt-1 text-xs text-slate-400">
            Open + realized exit values
          </p>
        </SpotlightCard>

        <SpotlightCard
          accent={stats.totalPnL >= 0 ? 'emerald' : 'rose'}
          className="p-5"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Investment P&amp;L
          </p>
          <AnimatedNumber
            value={stats.totalPnL}
            currency={currency}
            showSign
            className={`mt-2 block text-2xl sm:text-3xl font-extrabold ${
              stats.totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          />
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Portfolio ROI:{' '}
            <span
              className={`font-mono-num ${
                stats.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {stats.roi >= 0 ? '+' : ''}
              {stats.roi.toFixed(1)}%
            </span>
          </p>
        </SpotlightCard>

        <SpotlightCard accent="emerald" className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Winning Ratio
            </p>
            <Award className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <AnimatedNumber
            value={stats.winRate}
            format="percent"
            className="mt-2 block text-2xl sm:text-3xl font-extrabold text-slate-900"
          />
          <p className="mt-1 text-xs text-slate-400">
            {stats.winners} of {investments.length} positions in profit
          </p>
        </SpotlightCard>
      </div>

      {/* Asset Allocation Strip */}
      {stats.assetClasses.length > 0 && (
        <SpotlightCard accent="amber" interactive={false} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-extrabold text-slate-900">
                Asset Class Allocation
              </h2>
              <p className="text-xs text-slate-500">
                Distribution of deployed investment capital
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-[11px] font-bold text-amber-800">
              <Sparkles className="h-3 w-3" /> {stats.assetClasses.length} Asset Classes
            </span>
          </div>

          {/* Stacked Bar */}
          <div className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 gap-0.5">
            {stats.assetClasses.map((ac) => {
              const pct =
                stats.currentVal > 0 ? (ac.current / stats.currentVal) * 100 : 0;
              return (
                <motion.div
                  key={ac.name}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, pct)}%` }}
                  transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                  title={`${ac.name}: ${pct.toFixed(1)}%`}
                  className="h-full rounded-full"
                  style={{ backgroundColor: ac.color }}
                />
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.assetClasses.map((ac) => {
              const pct =
                stats.currentVal > 0 ? (ac.current / stats.currentVal) * 100 : 0;
              return (
                <div
                  key={ac.name}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ac.color }}
                    />
                    <span className="truncate text-xs font-bold text-slate-800">
                      {ac.name}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="font-mono-num text-sm font-extrabold text-slate-900">
                      {formatMoney(ac.current, currency, { compact: true })}
                    </span>
                    <span className="font-mono-num text-[11px] font-bold text-slate-500">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SpotlightCard>
      )}

      {/* Positions List */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-extrabold text-slate-900">
            Investment Positions
          </h2>
          <SegmentedControl
            layoutId="invest-status-filter"
            size="sm"
            activeTone="amber"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All', badge: investments.length },
              {
                value: 'open',
                label: 'Active / Open',
                badge: investments.filter((e) => (e.pnlStatus || 'open') === 'open')
                  .length,
              },
              {
                value: 'realized',
                label: 'Closed / Realized',
                badge: investments.filter((e) => e.pnlStatus === 'realized').length,
              },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="md:col-span-2 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-12 text-center"
              >
                <p className="text-sm font-bold text-slate-700">
                  No investment entries in this view
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Click &ldquo;Add Investment Expense&rdquo; to track stocks, ETFs, crypto, real estate, or venture allocations.
                </p>
              </motion.div>
            ) : (
              filtered.map((pos) => {
                const current = pos.currentValue ?? pos.amount;
                const pnl = pos.pnlAmount ?? current - pos.amount;
                const roi = pos.amount > 0 ? (pnl / pos.amount) * 100 : 0;
                const isUp = pnl >= 0;
                const accentColor = CATEGORY_COLORS[pos.category] || '#F59E0B';

                return (
                  <motion.div
                    key={pos.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                  >
                    <SpotlightCard
                      accent={isUp ? 'emerald' : 'rose'}
                      className="p-5 h-full flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-extrabold text-white shadow-sm"
                              style={{ backgroundColor: accentColor }}
                            >
                              {pos.ticker || pos.title.slice(0, 3).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate font-display text-sm font-extrabold text-slate-900">
                                {pos.title}
                              </h3>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="font-semibold">{pos.category}</span>
                                <span>•</span>
                                <span>{formatShortDate(pos.date)}</span>
                              </div>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              pos.pnlStatus === 'realized'
                                ? 'bg-slate-900 text-white'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {pos.pnlStatus === 'realized' ? 'Realized' : 'Active'}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50/90 p-3 border border-slate-100">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Invested
                            </p>
                            <p className="font-mono-num mt-0.5 text-xs sm:text-sm font-extrabold text-slate-800">
                              {formatMoney(pos.amount, currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Current Val
                            </p>
                            <p className="font-mono-num mt-0.5 text-xs sm:text-sm font-extrabold text-slate-900">
                              {formatMoney(current, currency)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              P&amp;L
                            </p>
                            <p
                              className={`font-mono-num mt-0.5 text-xs sm:text-sm font-extrabold ${
                                isUp ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {formatMoney(pnl, currency, { showSign: true })}
                            </p>
                          </div>
                        </div>

                        {(pos.pnlNote || pos.notes) && (
                          <p className="mt-2.5 text-xs text-slate-500 line-clamp-2">
                            {pos.pnlNote || pos.notes}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                            isUp
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {isUp ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          <span className="font-mono-num">
                            {roi >= 0 ? '+' : ''}
                            {roi.toFixed(1)}% ROI
                          </span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPnLReportModal(pos)}
                            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
                          >
                            Update P&amp;L
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(pos)}
                            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEntry(pos.id)}
                            className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </SpotlightCard>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
