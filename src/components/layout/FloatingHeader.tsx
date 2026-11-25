import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  ArrowLeftRight,
  Landmark,
  TrendingUp,
  CalendarRange,
  Plus,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  Database,
  FileJson,
} from 'lucide-react';
import { ActiveTab, CURRENCIES, CurrencyCode } from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { financeApi } from '../../services/api';
import { exportEntriesToCSV } from '../../utils/finance';

interface FloatingHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'cashflow', label: 'Cash Flow', icon: ArrowLeftRight },
  { id: 'investments', label: 'Investments', icon: Landmark },
  { id: 'pnl', label: 'P&L Reports', icon: TrendingUp },
  { id: 'summaries', label: 'Summaries', icon: CalendarRange },
];

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({
  activeTab,
  onTabChange,
}) => {
  const {
    entries,
    currency,
    syncState,
    dbDriver,
    setCurrency,
    openAddModal,
    resetDemoData,
    clearAllData,
    importEntries,
  } = useFinance();

  const [menuOpen, setMenuOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (currRef.current && !currRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed?.entries;
      if (Array.isArray(list)) {
        await importEntries(list);
      }
    } catch {
      // handled cleanly by context toast if invalid
    } finally {
      e.target.value = '';
      setMenuOpen(false);
    }
  };

  const syncBadge = (() => {
    if (syncState === 'saving' || syncState === 'loading') {
      return {
        dot: 'bg-amber-400 animate-pulse',
        text: syncState === 'loading' ? 'Connecting...' : 'Saving...',
        cls: 'bg-amber-50 text-amber-700 border-amber-200/80',
      };
    }
    if (syncState === 'offline') {
      return {
        dot: 'bg-rose-500',
        text: 'API Offline',
        cls: 'bg-rose-50 text-rose-700 border-rose-200/80',
      };
    }
    return {
      dot: 'bg-emerald-500',
      text: dbDriver === 'postgres' ? 'PostgreSQL' : 'SQLite DB',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    };
  })();

  return (
    <header className="no-print sticky top-3 z-40 mx-auto max-w-7xl px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="glass-header flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-4"
      >
        {/* Brand Identity + Live DB Sync Pill */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onTabChange('overview')}
            className="group flex items-center gap-2.5 rounded-xl pr-1 text-left cursor-pointer"
          >
            <motion.div
              whileHover={{ rotate: 8, scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-400 text-white shadow-md shadow-emerald-500/25"
            >
              <Sparkles className="h-4.5 w-4.5 stroke-[2.3]" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${syncBadge.dot}`}
              />
            </motion.div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[15px] font-extrabold tracking-tight text-slate-900">
                  Verdant
                </span>
                <span
                  title="Live database persistence status"
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold tracking-tight ${syncBadge.cls}`}
                >
                  <Database className="h-2.5 w-2.5" />
                  {syncBadge.text}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 -mt-0.5">
                Wealth &amp; P&amp;L Studio
              </p>
            </div>
          </button>
        </div>

        {/* Center Spring-Animated Pill Navigation */}
        <nav className="hidden lg:flex items-center gap-1 rounded-2xl border border-slate-200/70 bg-slate-100/70 p-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="header-active-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    className="absolute inset-0 rounded-xl bg-white shadow-sm shadow-slate-900/8 border border-slate-200/80"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon
                    className={`h-3.5 w-3.5 transition-colors ${
                      active ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Currency Switcher */}
          <div className="relative" ref={currRef}>
            <button
              type="button"
              onClick={() => setCurrencyOpen((o) => !o)}
              className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-2 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <span className="text-emerald-600">{CURRENCIES[currency].symbol}</span>
              <span>{currency}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            <AnimatePresence>
              {currencyOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  className="absolute right-0 mt-2 w-36 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl shadow-slate-900/10"
                >
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setCurrency(code);
                        setCurrencyOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        currency === code
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{code}</span>
                      <span className="font-mono-num text-slate-400">
                        {CURRENCIES[code].symbol}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Data Tools Popover */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              title="Database & Export Options"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-900/10"
                >
                  <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Database &amp; Backups
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      exportEntriesToCSV(
                        entries,
                        `verdant-ledger-${new Date().toISOString().slice(0, 10)}.csv`
                      );
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Full Ledger (CSV)
                  </button>
                  <a
                    href={financeApi.getJsonExportUrl()}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <FileJson className="h-3.5 w-3.5" />
                    Download DB Backup (JSON)
                  </a>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Import Backup (JSON)
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      resetDemoData();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Load Sample Data
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearAllData();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All Entries
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Primary Shimmer CTA */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => openAddModal('income')}
            className="btn-shimmer relative overflow-hidden flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-3.5 py-2 text-xs sm:text-[13px] font-bold text-white shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Record Entry</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile / Tablet Nav Pill */}
      <div className="mt-2.5 flex lg:hidden items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/85 p-1 backdrop-blur-md">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                active ? 'text-white' : 'text-slate-600'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-slate-900"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
