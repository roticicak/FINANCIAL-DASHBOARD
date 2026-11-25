import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SEED_ENTRIES } from '../data/seedData';
import { financeApi } from '../services/api';
import {
  CurrencyCode,
  EntryType,
  FinanceEntry,
  PnLStatus,
} from '../types/finance';

export type SyncState = 'loading' | 'synced' | 'saving' | 'offline';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'emerald' | 'amber' | 'rose' | 'blue';
}

interface FinanceContextValue {
  entries: FinanceEntry[];
  currency: CurrencyCode;
  syncState: SyncState;
  dbDriver: 'sqlite' | 'postgres' | null;
  setCurrency: (c: CurrencyCode) => void;
  addEntry: (entry: Omit<FinanceEntry, 'id'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<FinanceEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  reportPnL: (
    id: string,
    payload: {
      pnlAmount: number;
      currentValue: number;
      pnlStatus: PnLStatus;
      pnlNote?: string;
      pnlUpdatedAt?: string;
    }
  ) => Promise<void>;
  resetDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  importEntries: (entries: FinanceEntry[]) => Promise<void>;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  // Modal controls
  modalOpen: boolean;
  modalMode: EntryType | 'pnl';
  editingEntry: FinanceEntry | null;
  pnlTargetEntry: FinanceEntry | null;
  openAddModal: (mode?: EntryType | 'pnl') => void;
  openEditModal: (entry: FinanceEntry) => void;
  openPnLReportModal: (entry: FinanceEntry) => void;
  closeModal: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [syncState, setSyncState] = useState<SyncState>('loading');
  const [dbDriver, setDbDriver] = useState<'sqlite' | 'postgres' | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<EntryType | 'pnl'>('income');
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [pnlTargetEntry, setPnlTargetEntry] = useState<FinanceEntry | null>(null);

  const pushToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Hydrate ledger + settings from backend database on mount
  useEffect(() => {
    let active = true;
    async function hydrate() {
      try {
        const [healthRes, entriesRes, settingsRes] = await Promise.all([
          financeApi.health(),
          financeApi.listEntries(),
          financeApi.getSettings(),
        ]);
        if (!active) return;
        setDbDriver(healthRes.driver);
        setEntries(entriesRes.entries);
        if (
          settingsRes.currency &&
          ['USD', 'EUR', 'GBP', 'IDR', 'SGD'].includes(settingsRes.currency)
        ) {
          setCurrencyState(settingsRes.currency);
        }
        setSyncState('synced');
      } catch (err) {
        if (!active) return;
        console.error('Failed to connect to Verdant backend:', err);
        setSyncState('offline');
        pushToast({
          title: 'Backend unreachable',
          description: 'Start the API server to persist your financial records.',
          tone: 'rose',
        });
      }
    }
    hydrate();
    return () => {
      active = false;
    };
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    setSyncState('saving');
    financeApi
      .updateCurrency(c)
      .then(() => setSyncState('synced'))
      .catch(() => setSyncState('offline'));
  };

  const addEntry = async (entry: Omit<FinanceEntry, 'id'>) => {
    setSyncState('saving');
    try {
      const { entry: created } = await financeApi.createEntry(entry);
      setEntries((prev) => [created, ...prev]);
      setSyncState('synced');

      const tone =
        created.type === 'income'
          ? 'emerald'
          : created.type === 'investment'
            ? 'amber'
            : 'rose';
      const label =
        created.type === 'income'
          ? 'Income saved to database'
          : created.type === 'investment'
            ? 'Investment saved to database'
            : 'Expense saved to database';
      pushToast({ title: label, description: created.title, tone });
    } catch (err) {
      setSyncState('offline');
      pushToast({
        title: 'Could not save entry',
        description: err instanceof Error ? err.message : 'Server error',
        tone: 'rose',
      });
    }
  };

  const updateEntry = async (id: string, updates: Partial<FinanceEntry>) => {
    setSyncState('saving');
    try {
      const { entry: updated } = await financeApi.updateEntry(id, updates);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      setSyncState('synced');
      pushToast({
        title: 'Entry updated',
        description: updated.title,
        tone: 'blue',
      });
    } catch (err) {
      setSyncState('offline');
      pushToast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Server error',
        tone: 'rose',
      });
    }
  };

  const deleteEntry = async (id: string) => {
    const target = entries.find((e) => e.id === id);
    setSyncState('saving');
    try {
      await financeApi.deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setSyncState('synced');
      pushToast({
        title: 'Entry deleted',
        description: target?.title,
        tone: 'rose',
      });
    } catch (err) {
      setSyncState('offline');
      pushToast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Server error',
        tone: 'rose',
      });
    }
  };

  const reportPnL = async (
    id: string,
    payload: {
      pnlAmount: number;
      currentValue: number;
      pnlStatus: PnLStatus;
      pnlNote?: string;
      pnlUpdatedAt?: string;
    }
  ) => {
    setSyncState('saving');
    try {
      const { entry: updated } = await financeApi.reportPnL(id, payload);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      setSyncState('synced');
      const isProfit = payload.pnlAmount >= 0;
      pushToast({
        title: isProfit ? 'Profit recorded' : 'Loss recorded',
        description: updated.title,
        tone: isProfit ? 'emerald' : 'rose',
      });
    } catch (err) {
      setSyncState('offline');
      pushToast({
        title: 'P&L report failed',
        description: err instanceof Error ? err.message : 'Server error',
        tone: 'rose',
      });
    }
  };

  const resetDemoData = async () => {
    setSyncState('saving');
    try {
      const { entries: saved } = await financeApi.replaceAllEntries(SEED_ENTRIES);
      setEntries(saved);
      setSyncState('synced');
      pushToast({
        title: 'Sample dataset loaded',
        description: 'Saved sample entries to your database',
        tone: 'blue',
      });
    } catch (err) {
      setSyncState('offline');
      pushToast({
        title: 'Failed to load sample data',
        description: err instanceof Error ? err.message : 'Server error',
        tone: 'rose',
      });
    }
  };

  const clearAllData = async () => {
    setSyncState('saving');
    try {
      await financeApi.clearAllEntries();
      setEntries([]);
      setSyncState('synced');
      pushToast({
        title: 'Database ledger cleared',
        description: 'All numbers reset to 0',
        tone: 'amber',
      });
    } catch (err) {
      setSyncState('offline');
      pushToast({
        title: 'Could not clear ledger',
        description: err instanceof Error ? err.message : 'Server error',
        tone: 'rose',
      });
    }
  };

  const importEntries = async (nextEntries: FinanceEntry[]) => {
    setSyncState('saving');
    try {
      const { entries: saved } = await financeApi.replaceAllEntries(nextEntries);
      setEntries(saved);
      setSyncState('synced');
      pushToast({
        title: 'Backup restored',
        description: `Imported ${saved.length} entries into database`,
        tone: 'emerald',
      });
    } catch (err) {
      setSyncState('offline');
      pushToast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Invalid JSON backup',
        tone: 'rose',
      });
    }
  };

  const openAddModal = (mode: EntryType | 'pnl' = 'income') => {
    setEditingEntry(null);
    setPnlTargetEntry(null);
    setModalMode(mode);
    setModalOpen(true);
  };

  const openEditModal = (entry: FinanceEntry) => {
    setEditingEntry(entry);
    setPnlTargetEntry(null);
    setModalMode(entry.type);
    setModalOpen(true);
  };

  const openPnLReportModal = (entry: FinanceEntry) => {
    setEditingEntry(null);
    setPnlTargetEntry(entry);
    setModalMode('pnl');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => {
      setEditingEntry(null);
      setPnlTargetEntry(null);
    }, 220);
  };

  const value = useMemo(
    () => ({
      entries,
      currency,
      syncState,
      dbDriver,
      setCurrency,
      addEntry,
      updateEntry,
      deleteEntry,
      reportPnL,
      resetDemoData,
      clearAllData,
      importEntries,
      toasts,
      dismissToast,
      modalOpen,
      modalMode,
      editingEntry,
      pnlTargetEntry,
      openAddModal,
      openEditModal,
      openPnLReportModal,
      closeModal,
    }),
    [
      entries,
      currency,
      syncState,
      dbDriver,
      toasts,
      modalOpen,
      modalMode,
      editingEntry,
      pnlTargetEntry,
    ]
  );

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
};

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
