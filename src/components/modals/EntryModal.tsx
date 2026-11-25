import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Check,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  CURRENCIES,
  EntryType,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INVESTMENT_CATEGORIES,
  PnLStatus,
} from '../../types/finance';
import { formatMoney } from '../../utils/finance';

export const EntryModal: React.FC = () => {
  const {
    entries,
    currency,
    modalOpen,
    modalMode,
    editingEntry,
    pnlTargetEntry,
    addEntry,
    updateEntry,
    reportPnL,
    closeModal,
  } = useFinance();

  const cfg = CURRENCIES[currency];

  const [tab, setTab] = useState<EntryType | 'pnl'>('income');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [amountInput, setAmountInput] = useState('');
  const todayISO = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayISO);
  const [notes, setNotes] = useState('');
  const [ticker, setTicker] = useState('');

  // Optional P&L tracking on Expense / Investment creation
  const [trackPnL, setTrackPnL] = useState(false);
  const [pnlInputMode, setPnlInputMode] = useState<'pnl' | 'value'>('value');
  const [outcomeInput, setOutcomeInput] = useState('');
  const [pnlStatus, setPnlStatus] = useState<PnLStatus>('realized');
  const [pnlNote, setPnlNote] = useState('');

  // For 'pnl' tab: pick an existing expense/investment
  const eligiblePnLItems = entries.filter(
    (e) => e.type === 'expense' || e.type === 'investment'
  );
  const [selectedPnLId, setSelectedPnLId] = useState<string>('');
  const [pnlSign, setPnlSign] = useState<'profit' | 'loss'>('profit');

  // Sync form state whenever modal opens
  useEffect(() => {
    if (!modalOpen) return;

    setTab(modalMode);

    if (editingEntry) {
      setTitle(editingEntry.title);
      setCategory(editingEntry.category);
      setAmountInput(
        String(Number((editingEntry.amount * cfg.rateFromUSD).toFixed(cfg.decimals)))
      );
      setDate(editingEntry.date);
      setNotes(editingEntry.notes || '');
      setTicker(editingEntry.ticker || '');
      setTrackPnL(Boolean(editingEntry.pnlTracked));
      setPnlStatus(
        editingEntry.pnlStatus && editingEntry.pnlStatus !== 'none'
          ? editingEntry.pnlStatus
          : editingEntry.type === 'investment'
            ? 'open'
            : 'realized'
      );
      setPnlNote(editingEntry.pnlNote || '');
      if (editingEntry.pnlTracked && editingEntry.currentValue !== undefined) {
        setPnlInputMode('value');
        setOutcomeInput(
          String(
            Number(
              (editingEntry.currentValue * cfg.rateFromUSD).toFixed(cfg.decimals)
            )
          )
        );
      } else {
        setOutcomeInput('');
      }
      return;
    }

    if (modalMode === 'pnl') {
      const target = pnlTargetEntry || eligiblePnLItems[0] || null;
      setSelectedPnLId(target?.id || '');
      if (target) {
        const existingPnL = target.pnlAmount ?? 0;
        setPnlSign(existingPnL < 0 ? 'loss' : 'profit');
        setPnlInputMode('pnl');
        setOutcomeInput(
          existingPnL !== 0
            ? String(
                Number(
                  (Math.abs(existingPnL) * cfg.rateFromUSD).toFixed(cfg.decimals)
                )
              )
            : ''
        );
        setPnlStatus(
          target.pnlStatus && target.pnlStatus !== 'none'
            ? target.pnlStatus
            : target.type === 'investment'
              ? 'open'
              : 'realized'
        );
        setPnlNote(target.pnlNote || '');
      }
      return;
    }

    // Fresh entry defaults
    setTitle('');
    setAmountInput('');
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setTicker('');
    setOutcomeInput('');
    setPnlNote('');
    if (modalMode === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
      setTrackPnL(false);
    } else if (modalMode === 'expense') {
      setCategory(EXPENSE_CATEGORIES[0]);
      setTrackPnL(false);
      setPnlStatus('realized');
    } else if (modalMode === 'investment') {
      setCategory(INVESTMENT_CATEGORIES[0]);
      setTrackPnL(true);
      setPnlStatus('open');
      setPnlInputMode('value');
    }
  }, [modalOpen, modalMode, editingEntry, pnlTargetEntry]);

  // Switch category list cleanly when user clicks a different tab in Add mode
  const handleSwitchTab = (next: EntryType | 'pnl') => {
    if (editingEntry) return;
    setTab(next);
    if (next === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
      setTrackPnL(false);
    } else if (next === 'expense') {
      setCategory(EXPENSE_CATEGORIES[0]);
      setTrackPnL(false);
      setPnlStatus('realized');
    } else if (next === 'investment') {
      setCategory(INVESTMENT_CATEGORIES[0]);
      setTrackPnL(true);
      setPnlStatus('open');
      setPnlInputMode('value');
    } else if (next === 'pnl') {
      const target =
        eligiblePnLItems.find((e) => e.id === selectedPnLId) ||
        eligiblePnLItems[0];
      if (target) {
        setSelectedPnLId(target.id);
        setPnlInputMode('pnl');
        setPnlSign((target.pnlAmount ?? 0) < 0 ? 'loss' : 'profit');
        setOutcomeInput(
          target.pnlAmount
            ? String(
                Number(
                  (Math.abs(target.pnlAmount) * cfg.rateFromUSD).toFixed(
                    cfg.decimals
                  )
                )
              )
            : ''
        );
        setPnlStatus(target.type === 'investment' ? 'open' : 'realized');
        setPnlNote(target.pnlNote || '');
      }
    }
  };

  const selectedPnLItem = eligiblePnLItems.find((e) => e.id === selectedPnLId);

  const categories =
    tab === 'income'
      ? INCOME_CATEGORIES
      : tab === 'investment'
        ? INVESTMENT_CATEGORIES
        : EXPENSE_CATEGORIES;

  // Live preview of P&L calculation
  const numericAmountUSD = (parseFloat(amountInput) || 0) / cfg.rateFromUSD;
  const numericOutcomeUSD = (parseFloat(outcomeInput) || 0) / cfg.rateFromUSD;

  const computedEntryPnL = (() => {
    if (!trackPnL || tab === 'income') return { pnl: 0, curVal: numericAmountUSD };
    if (outcomeInput.trim() === '') {
      return { pnl: 0, curVal: numericAmountUSD };
    }
    if (pnlInputMode === 'value') {
      return {
        curVal: numericOutcomeUSD,
        pnl: numericOutcomeUSD - numericAmountUSD,
      };
    } else {
      const signed = pnlSign === 'loss' ? -Math.abs(numericOutcomeUSD) : Math.abs(numericOutcomeUSD);
      return {
        pnl: signed,
        curVal: Math.max(0, numericAmountUSD + signed),
      };
    }
  })();

  const computedReportPnL = (() => {
    if (!selectedPnLItem) return { pnl: 0, curVal: 0 };
    if (pnlInputMode === 'value') {
      const curVal = numericOutcomeUSD;
      return { curVal, pnl: curVal - selectedPnLItem.amount };
    } else {
      const signed =
        pnlSign === 'loss'
          ? -Math.abs(numericOutcomeUSD)
          : Math.abs(numericOutcomeUSD);
      return {
        pnl: signed,
        curVal: Math.max(0, selectedPnLItem.amount + signed),
      };
    }
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (tab === 'pnl') {
      if (!selectedPnLItem) return;
      reportPnL(selectedPnLItem.id, {
        pnlAmount: Number(computedReportPnL.pnl.toFixed(2)),
        currentValue: Number(computedReportPnL.curVal.toFixed(2)),
        pnlStatus,
        pnlNote: pnlNote.trim() || undefined,
      });
      closeModal();
      return;
    }

    if (!title.trim() || numericAmountUSD <= 0) return;

    const payload = {
      type: tab,
      title: title.trim(),
      category,
      amount: Number(numericAmountUSD.toFixed(2)),
      date,
      notes: notes.trim() || undefined,
      ticker: tab === 'investment' && ticker.trim() ? ticker.trim().toUpperCase() : undefined,
      assetClass: tab === 'investment' ? category : undefined,
      pnlTracked: tab !== 'income' ? trackPnL : false,
      pnlStatus:
        tab !== 'income' && trackPnL ? pnlStatus : ('none' as PnLStatus),
      currentValue:
        tab !== 'income' && trackPnL
          ? Number(computedEntryPnL.curVal.toFixed(2))
          : undefined,
      pnlAmount:
        tab !== 'income' && trackPnL
          ? Number(computedEntryPnL.pnl.toFixed(2))
          : undefined,
      pnlUpdatedAt: tab !== 'income' && trackPnL ? date : undefined,
      pnlNote: tab !== 'income' && trackPnL && pnlNote.trim() ? pnlNote.trim() : undefined,
    };

    if (editingEntry) {
      updateEntry(editingEntry.id, payload);
    } else {
      addEntry(payload);
    }
    closeModal();
  };

  const tabMeta = [
    {
      id: 'income' as const,
      label: 'Income',
      icon: ArrowDownLeft,
      activeBg: 'bg-emerald-500 text-white shadow-emerald-500/25',
    },
    {
      id: 'expense' as const,
      label: 'Expense',
      icon: ArrowUpRight,
      activeBg: 'bg-rose-500 text-white shadow-rose-500/25',
    },
    {
      id: 'investment' as const,
      label: 'Investment',
      icon: Landmark,
      activeBg: 'bg-amber-500 text-white shadow-amber-500/25',
    },
    {
      id: 'pnl' as const,
      label: 'Report P&L',
      icon: TrendingUp,
      activeBg: 'bg-sky-600 text-white shadow-sky-500/25',
    },
  ];

  return (
    <AnimatePresence>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeModal}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-md"
          />

          {/* Spring Modal Card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="relative z-10 w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-slate-900/20"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  <Sparkles className="h-3 w-3" />
                  {editingEntry
                    ? 'Edit Ledger Record'
                    : tab === 'pnl'
                      ? 'Profit & Loss Report'
                      : 'New Financial Entry'}
                </div>
                <h2 className="mt-1.5 font-display text-xl font-extrabold text-slate-900">
                  {editingEntry
                    ? `Update "${editingEntry.title}"`
                    : tab === 'income'
                      ? 'Record Income Inflow'
                      : tab === 'expense'
                        ? 'Log an Expense'
                        : tab === 'investment'
                          ? 'Record Investment Expense'
                          : 'Report Profit or Loss'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher (hidden while editing existing entry) */}
            {!editingEntry && (
              <div className="mt-5 grid grid-cols-4 gap-1.5 rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200/70">
                {tabMeta.map((m) => {
                  const Icon = m.icon;
                  const active = tab === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSwitchTab(m.id)}
                      className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer ${
                        active ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="modal-mode-pill"
                          transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                          className={`absolute inset-0 rounded-xl shadow-md ${m.activeBg}`}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{m.label}</span>
                        <span className="sm:hidden">{m.label.split(' ')[0]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {tab === 'pnl' ? (
                /* ======================== REPORT P&L MODE ======================== */
                <>
                  {eligiblePnLItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        No expenses or investments yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Add an expense or investment first, then report its profit or loss here.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Select Expense or Investment
                        </label>
                        <select
                          value={selectedPnLId}
                          onChange={(e) => {
                            const nextId = e.target.value;
                            setSelectedPnLId(nextId);
                            const found = eligiblePnLItems.find((x) => x.id === nextId);
                            if (found) {
                              setPnlStatus(
                                found.type === 'investment' ? 'open' : 'realized'
                              );
                              setPnlNote(found.pnlNote || '');
                            }
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                        >
                          {eligiblePnLItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              [{item.type === 'investment' ? 'Investment' : 'Expense'}]{' '}
                              {item.title} — Cost {formatMoney(item.amount, currency)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedPnLItem && (
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-sky-50/50 px-4 py-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-500">
                              Original Cost Basis ({selectedPnLItem.category})
                            </p>
                            <p className="font-mono-num text-lg font-extrabold text-slate-900">
                              {formatMoney(selectedPnLItem.amount, currency)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                              selectedPnLItem.type === 'investment'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {selectedPnLItem.type}
                          </span>
                        </div>
                      )}

                      {/* Input Method: Direct Profit/Loss vs Total Outcome Value */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPnlInputMode('pnl')}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                            pnlInputMode === 'pnl'
                              ? 'border-sky-500 bg-sky-50 text-sky-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Enter Direct Profit / Loss
                        </button>
                        <button
                          type="button"
                          onClick={() => setPnlInputMode('value')}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                            pnlInputMode === 'value'
                              ? 'border-sky-500 bg-sky-50 text-sky-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Enter Current / Return Value
                        </button>
                      </div>

                      {pnlInputMode === 'pnl' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPnlSign('profit')}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer ${
                              pnlSign === 'profit'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600'
                            }`}
                          >
                            <TrendingUp className="h-4 w-4" />
                            Report Profit (+)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPnlSign('loss')}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer ${
                              pnlSign === 'loss'
                                ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600'
                            }`}
                          >
                            <TrendingDown className="h-4 w-4" />
                            Report Loss (-)
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            {pnlInputMode === 'pnl'
                              ? `${pnlSign === 'profit' ? 'Profit' : 'Loss'} Amount (${cfg.symbol})`
                              : `Current / Exit Value (${cfg.symbol})`}
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={outcomeInput}
                            onChange={(e) => setOutcomeInput(e.target.value)}
                            placeholder="0.00"
                            className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-base font-bold text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            P&amp;L Status
                          </label>
                          <select
                            value={pnlStatus}
                            onChange={(e) => setPnlStatus(e.target.value as PnLStatus)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                          >
                            <option value="realized">Realized (Closed / Settled)</option>
                            <option value="open">Unrealized (Open / Active)</option>
                          </select>
                        </div>
                      </div>

                      {/* Live P&L Preview Banner */}
                      {selectedPnLItem && outcomeInput !== '' && (
                        <div
                          className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                            computedReportPnL.pnl >= 0
                              ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                              : 'border-rose-200 bg-rose-50/80 text-rose-900'
                          }`}
                        >
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                              Calculated P&amp;L Impact
                            </p>
                            <p className="font-mono-num text-lg font-extrabold">
                              {formatMoney(computedReportPnL.pnl, currency, {
                                showSign: true,
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                              ROI &amp; Final Value
                            </p>
                            <p className="font-mono-num text-sm font-bold">
                              {selectedPnLItem.amount > 0
                                ? `${computedReportPnL.pnl >= 0 ? '+' : ''}${(
                                    (computedReportPnL.pnl / selectedPnLItem.amount) *
                                    100
                                  ).toFixed(1)}%`
                                : '0%'}{' '}
                              · {formatMoney(computedReportPnL.curVal, currency)}
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          P&amp;L Report Note
                        </label>
                        <input
                          type="text"
                          value={pnlNote}
                          onChange={(e) => setPnlNote(e.target.value)}
                          placeholder="e.g., Sold inventory batch, Q4 market valuation, ad ROAS..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                /* ======================== INCOME / EXPENSE / INVESTMENT FORM ======================== */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={tab === 'investment' ? 'sm:col-span-2' : 'sm:col-span-3'}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Title / Description
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={
                          tab === 'income'
                            ? 'e.g., Monthly Salary, Design Retainer'
                            : tab === 'investment'
                              ? 'e.g., S&P 500 Index ETF, Bitcoin DCA'
                              : 'e.g., Q4 Ad Campaign, Groceries, Rent'
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      />
                    </div>
                    {tab === 'investment' && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Ticker / Symbol
                        </label>
                        <input
                          type="text"
                          value={ticker}
                          onChange={(e) => setTicker(e.target.value)}
                          placeholder="VOO, NVDA"
                          className="font-mono-num w-full uppercase rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        {tab === 'investment'
                          ? `Invested Capital (${cfg.symbol})`
                          : `Amount (${cfg.symbol})`}
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        placeholder="0.00"
                        className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-base font-bold text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Interactive Category Chips */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {tab === 'investment' ? 'Asset Class' : 'Category'}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((cat) => {
                        const selected = category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                              selected
                                ? tab === 'income'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                                  : tab === 'investment'
                                    ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs'
                                    : 'border-rose-500 bg-rose-50 text-rose-800 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional P&L Tracking Toggle for Expenses & Investments */}
                  {tab !== 'income' && (
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {tab === 'investment'
                              ? 'Track Market Value & P&L'
                              : 'Report Profit / Loss on this Expense'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {tab === 'investment'
                              ? 'Log current or exit value to measure unrealized/realized gain or loss.'
                              : 'Great for business spend, ad campaigns, flips, or recoverable expenses.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTrackPnL((v) => !v)}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                            trackPnL ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        >
                          <motion.span
                            layout
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm ${
                              trackPnL ? 'left-5.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </label>

                      <AnimatePresence>
                        {trackPnL && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3.5 space-y-3 border-t border-slate-200/80 pt-3.5">
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPnlInputMode('value')}
                                  className={`rounded-lg border py-1.5 text-[11px] font-bold cursor-pointer ${
                                    pnlInputMode === 'value'
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-slate-200 bg-white text-slate-600'
                                  }`}
                                >
                                  Current / Return Value
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPnlInputMode('pnl')}
                                  className={`rounded-lg border py-1.5 text-[11px] font-bold cursor-pointer ${
                                    pnlInputMode === 'pnl'
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-slate-200 bg-white text-slate-600'
                                  }`}
                                >
                                  Direct Profit / Loss
                                </button>
                              </div>

                              {pnlInputMode === 'pnl' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPnlSign('profit')}
                                    className={`rounded-lg border py-1.5 text-xs font-bold cursor-pointer ${
                                      pnlSign === 'profit'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-white text-slate-600'
                                    }`}
                                  >
                                    + Profit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPnlSign('loss')}
                                    className={`rounded-lg border py-1.5 text-xs font-bold cursor-pointer ${
                                      pnlSign === 'loss'
                                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                                        : 'border-slate-200 bg-white text-slate-600'
                                    }`}
                                  >
                                    - Loss
                                  </button>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                    {pnlInputMode === 'value'
                                      ? `Current / Return Value (${cfg.symbol})`
                                      : `${pnlSign === 'profit' ? 'Profit' : 'Loss'} (${cfg.symbol})`}
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={outcomeInput}
                                    onChange={(e) => setOutcomeInput(e.target.value)}
                                    placeholder={amountInput || '0.00'}
                                    className="font-mono-num w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                    Status
                                  </label>
                                  <select
                                    value={pnlStatus}
                                    onChange={(e) =>
                                      setPnlStatus(e.target.value as PnLStatus)
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-400 focus:outline-none"
                                  >
                                    <option value="open">Open / Unrealized</option>
                                    <option value="realized">Realized / Closed</option>
                                  </select>
                                </div>
                              </div>

                              {outcomeInput !== '' && numericAmountUSD > 0 && (
                                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-200/80 text-xs">
                                  <span className="font-semibold text-slate-500">
                                    Resulting P&amp;L:
                                  </span>
                                  <span
                                    className={`font-mono-num font-bold ${
                                      computedEntryPnL.pnl >= 0
                                        ? 'text-emerald-600'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {formatMoney(computedEntryPnL.pnl, currency, {
                                      showSign: true,
                                    })}{' '}
                                    (
                                    {computedEntryPnL.pnl >= 0 ? '+' : ''}
                                    {(
                                      (computedEntryPnL.pnl / numericAmountUSD) *
                                      100
                                    ).toFixed(1)}
                                    %)
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add context, payment reference, or thesis..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={tab === 'pnl' && eligiblePnLItems.length === 0}
                  className="btn-shimmer relative overflow-hidden flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>
                    {editingEntry
                      ? 'Save Changes'
                      : tab === 'pnl'
                        ? 'Submit P&L Report'
                        : `Add ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
                  </span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
