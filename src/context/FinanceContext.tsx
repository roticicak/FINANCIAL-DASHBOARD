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

export type SyncState = 'loading' | 'synced' | 'saving' | 'local';

const LOCAL_ENTRIES_KEY = 'verdant_local_entries_v3';
const LOCAL_CURRENCY_KEY = 'verdant_local_currency_v3';

function readLocalEntries(): FinanceEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_ENTRIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

function writeLocalEntries(entries: FinanceEntry[]) {
  try {
    localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

function readLocalCurrency(): CurrencyCode {
  try {
    const raw = localStorage.getItem(LOCAL_CURRENCY_KEY) as CurrencyCode | null;
    if (raw && ['USD', 'EUR', 'GBP', 'IDR', 'SGD'].includes(raw)) return raw;
  } catch {
    // ignore
  }
  return 'USD';
}

function writeLocalCurrency(c: CurrencyCode) {
  try {
    localStorage.setItem(LOCAL_CURRENCY_KEY, c);
  } catch {
    // ignore
  }
}

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
  dbDriver: 'sqlite' | 'postgres' | 'none' | null;
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
  const [currency, setCurrencyState] = useState<CurrencyCode>(() =>
    readLocalCurrency()
  );
  const [syncState, setSyncState] = useState<SyncState>('loading');
  const [dbDriver, setDbDriver] = useState<'sqlite' | 'postgres' | 'none' | null>(
    null
  );
  const [useRemoteDb, setUseRemoteDb] = useState<boolean>(false);

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

  // Connect to backend DB; seamlessly fall back to browser persistence if deployed without DATABASE_URL yet
  useEffect(() => {
    let active = true;
    async function hydrate() {
      try {
        const healthRes = await financeApi.health();
        if (!active) return;

        if (healthRes.ok && healthRes.persistent) {
          const [entriesRes, settingsRes] = await Promise.all([
            financeApi.listEntries(),
            financeApi.getSettings(),
          ]);
          if (!active) return;

          setDbDriver(healthRes.driver);
          setUseRemoteDb(true);
          setEntries(entriesRes.entries);
          writeLocalEntries(entriesRes.entries);

          if (
            settingsRes.currency &&
            ['USD', 'EUR', 'GBP', 'IDR', 'SGD'].includes(settingsRes.currency)
          ) {
            setCurrencyState(settingsRes.currency);
            writeLocalCurrency(settingsRes.currency);
          }
          setSyncState('synced');
          return;
        }

        // Deployed on Vercel without DATABASE_URL yet: gracefully persist in localStorage
        setDbDriver('none');
        setUseRemoteDb(false);
        setEntries(readLocalEntries());
        setSyncState('local');
      } catch {
        if (!active) return;
        setDbDriver('none');
        setUseRemoteDb(false);
        setEntries(readLocalEntries());
        setSyncState('local');
      }
    }
    hydrate();
    return () => {
      active = false;
    };
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    writeLocalCurrency(c);
    if (!useRemoteDb) return;
    setSyncState('saving');
    financeApi
      .updateCurrency(c)
      .then(() => setSyncState('synced'))
      .catch(() => setSyncState('local'));
  };

  const addEntry = async (entry: Omit<FinanceEntry, 'id'>) => {
    const tone =
      entry.type === 'income'
        ? 'emerald'
        : entry.type === 'investment'
          ? 'amber'
          : 'rose';

    if (useRemoteDb) {
      setSyncState('saving');
      try {
        const { entry: created } = await financeApi.createEntry(entry);
        setEntries((prev) => {
          const next = [created, ...prev];
          writeLocalEntries(next);
          return next;
        });
        setSyncState('synced');
        const label =
          created.type === 'income'
            ? 'Income saved to database'
            : created.type === 'investment'
              ? 'Investment saved to database'
              : 'Expense saved to database';
        pushToast({ title: label, description: created.title, tone });
        return;
      } catch {
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    // Local persistent fallback (always records user input!)
    const localCreated: FinanceEntry = {
      ...entry,
      id: `ent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setEntries((prev) => {
      const next = [localCreated, ...prev];
      writeLocalEntries(next);
      return next;
    });
    const label =
      localCreated.type === 'income'
        ? 'Income recorded'
        : localCreated.type === 'investment'
          ? 'Investment recorded'
          : 'Expense recorded';
    pushToast({ title: label, description: localCreated.title, tone });
  };

  const updateEntry = async (id: string, updates: Partial<FinanceEntry>) => {
    if (useRemoteDb) {
      setSyncState('saving');
      try {
        const { entry: updated } = await financeApi.updateEntry(id, updates);
        setEntries((prev) => {
          const next = prev.map((e) => (e.id === id ? updated : e));
          writeLocalEntries(next);
          return next;
        });
        setSyncState('synced');
        pushToast({
          title: 'Entry updated',
          description: updated.title,
          tone: 'blue',
        });
        return;
      } catch {
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      writeLocalEntries(next);
      return next;
    });
    pushToast({
      title: 'Entry updated',
      description: updates.title || 'Saved changes',
      tone: 'blue',
    });
  };

  const deleteEntry = async (id: string) => {
    const target = entries.find((e) => e.id === id);
    if (useRemoteDb) {
      setSyncState('saving');
      try {
        await financeApi.deleteEntry(id);
        setEntries((prev) => {
          const next = prev.filter((e) => e.id !== id);
          writeLocalEntries(next);
          return next;
        });
        setSyncState('synced');
        pushToast({
          title: 'Entry deleted',
          description: target?.title,
          tone: 'rose',
        });
        return;
      } catch {
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      writeLocalEntries(next);
      return next;
    });
    pushToast({
      title: 'Entry deleted',
      description: target?.title,
      tone: 'rose',
    });
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
    const isProfit = payload.pnlAmount >= 0;
    if (useRemoteDb) {
      setSyncState('saving');
      try {
        const { entry: updated } = await financeApi.reportPnL(id, payload);
        setEntries((prev) => {
          const next = prev.map((e) => (e.id === id ? updated : e));
          writeLocalEntries(next);
          return next;
        });
        setSyncState('synced');
        pushToast({
          title: isProfit ? 'Profit recorded' : 'Loss recorded',
          description: updated.title,
          tone: isProfit ? 'emerald' : 'rose',
        });
        return;
      } catch {
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    const target = entries.find((e) => e.id === id);
    setEntries((prev) => {
      const next = prev.map((e) =>
        e.id === id
          ? {
              ...e,
              pnlTracked: true,
              pnlStatus: payload.pnlStatus,
              pnlAmount: payload.pnlAmount,
              currentValue: payload.currentValue,
              pnlNote: payload.pnlNote ?? e.pnlNote,
              pnlUpdatedAt:
                payload.pnlUpdatedAt || new Date().toISOString().slice(0, 10),
            }
          : e
      );
      writeLocalEntries(next);
      return next;
    });
    pushToast({
      title: isProfit ? 'Profit recorded' : 'Loss recorded',
      description: target?.title,
      tone: isProfit ? 'emerald' : 'rose',
    });
  };

  const resetDemoData = async () => {
    if (useRemoteDb) {
      setSyncState('saving');
      try {
        const { entries: saved } = await financeApi.replaceAllEntries(SEED_ENTRIES);
        setEntries(saved);
        writeLocalEntries(saved);
        setSyncState('synced');
        pushToast({
          title: 'Sample dataset loaded',
          description: 'Saved sample entries to your database',
          tone: 'blue',
        });
        return;
      } catch {
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    setEntries(SEED_ENTRIES);
    writeLocalEntries(SEED_ENTRIES);
    pushToast({
      title: 'Sample dataset loaded',
      description: 'Loaded sample transactions across Sep – Nov 2026',
      tone: 'blue',
    });
  };

  const clearAllData = async () => {
    if (useRemoteDb) {
      setSyncState('saving');
      try {
        await financeApi.clearAllEntries();
        setEntries([]);
        writeLocalEntries([]);
        setSyncState('synced');
        pushToast({
          title: 'Database ledger cleared',
          description: 'All numbers reset to 0',
          tone: 'amber',
        });
        return;
      } catch {
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    setEntries([]);
    writeLocalEntries([]);
    pushToast({
      title: 'Ledger cleared',
      description: 'All numbers reset to 0',
      tone: 'amber',
    });
  };

  const importEntries = async (nextEntries: FinanceEntry[]) => {
    if (useRemoteDb) {
      setSyncState('saving');
      try {
        const { entries: saved } = await financeApi.replaceAllEntries(nextEntries);
        setEntries(saved);
        writeLocalEntries(saved);
        setSyncState('synced');
        pushToast({
          title: 'Backup restored',
          description: `Imported ${saved.length} entries into database`,
          tone: 'emerald',
        });
        return;
      } catch {
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    setEntries(nextEntries);
    writeLocalEntries(nextEntries);
    pushToast({
      title: 'Backup restored',
      description: `Imported ${nextEntries.length} entries`,
      tone: 'emerald',
    });
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
