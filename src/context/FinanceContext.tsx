import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
const LOCAL_MEMBERS_KEY = 'verdant_local_members_v3';
const DEVICE_MEMBER_KEY = 'verdant_device_active_member_v1';
const DEFAULT_MEMBERS = ['Person 1', 'Person 2'];
const POLL_INTERVAL_MS = 8000;

function readLocalEntries(): FinanceEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_ENTRIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLocalEntries(entries: FinanceEntry[]) {
  try {
    localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // ignore
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

function readLocalMembers(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_MEMBERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_MEMBERS;
}

function writeLocalMembers(members: string[]) {
  try {
    localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
  } catch {
    // ignore
  }
}

function readDeviceMember(members: string[]): string {
  try {
    const saved = localStorage.getItem(DEVICE_MEMBER_KEY);
    if (saved && members.includes(saved)) return saved;
  } catch {
    // ignore
  }
  return members[0] || 'Person 1';
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
  members: string[];
  activeMember: string;
  syncState: SyncState;
  dbDriver: 'sqlite' | 'postgres' | 'none' | null;
  lastSyncedAt: string | null;
  setCurrency: (c: CurrencyCode) => void;
  setActiveMember: (name: string) => void;
  updateMembers: (members: string[]) => Promise<void>;
  syncNow: (silent?: boolean) => Promise<void>;
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
  const [members, setMembers] = useState<string[]>(() => readLocalMembers());
  const [activeMember, setActiveMemberState] = useState<string>(() =>
    readDeviceMember(readLocalMembers())
  );
  const [syncState, setSyncState] = useState<SyncState>('loading');
  const [dbDriver, setDbDriver] = useState<'sqlite' | 'postgres' | 'none' | null>(
    null
  );
  const [useRemoteDb, setUseRemoteDb] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<EntryType | 'pnl'>('income');
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [pnlTargetEntry, setPnlTargetEntry] = useState<FinanceEntry | null>(null);

  const entriesHashRef = useRef<string>('');
  const isMutatingRef = useRef<boolean>(false);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const applyRemoteSnapshot = useCallback(
    (
      nextEntries: FinanceEntry[],
      nextCurrency?: CurrencyCode,
      nextMembers?: string[],
      notifyOnChange?: boolean
    ) => {
      const nextHash = JSON.stringify(nextEntries);
      if (nextHash !== entriesHashRef.current) {
        const hadInitial = entriesHashRef.current !== '';
        entriesHashRef.current = nextHash;
        setEntries(nextEntries);
        writeLocalEntries(nextEntries);
        if (notifyOnChange && hadInitial) {
          pushToast({
            title: 'Live sync updated',
            description: 'New changes received from shared database',
            tone: 'blue',
          });
        }
      }

      if (
        nextCurrency &&
        ['USD', 'EUR', 'GBP', 'IDR', 'SGD'].includes(nextCurrency)
      ) {
        setCurrencyState(nextCurrency);
        writeLocalCurrency(nextCurrency);
      }

      if (Array.isArray(nextMembers) && nextMembers.length > 0) {
        setMembers(nextMembers);
        writeLocalMembers(nextMembers);
        setActiveMemberState((curr) =>
          nextMembers.includes(curr) ? curr : nextMembers[0]
        );
      }

      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    },
    [pushToast]
  );

  // Initial hydration from shared backend DB (or local fallback if no DB attached yet)
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
          applyRemoteSnapshot(
            entriesRes.entries,
            settingsRes.currency,
            settingsRes.members,
            false
          );
          setSyncState('synced');
          return;
        }

        setDbDriver('none');
        setUseRemoteDb(false);
        const local = readLocalEntries();
        entriesHashRef.current = JSON.stringify(local);
        setEntries(local);
        setSyncState('local');
      } catch {
        if (!active) return;
        setDbDriver('none');
        setUseRemoteDb(false);
        const local = readLocalEntries();
        entriesHashRef.current = JSON.stringify(local);
        setEntries(local);
        setSyncState('local');
      }
    }
    hydrate();
    return () => {
      active = false;
    };
  }, [applyRemoteSnapshot]);

  // Manual or background live sync for multi-device collaboration
  const syncNow = useCallback(
    async (silent = false) => {
      if (!useRemoteDb || isMutatingRef.current) return;
      try {
        const [entriesRes, settingsRes] = await Promise.all([
          financeApi.listEntries(),
          financeApi.getSettings(),
        ]);
        applyRemoteSnapshot(
          entriesRes.entries,
          settingsRes.currency,
          settingsRes.members,
          silent
        );
        setSyncState('synced');
        if (!silent) {
          pushToast({
            title: 'Dashboard synced',
            description: 'Up to date with shared database',
            tone: 'emerald',
          });
        }
      } catch {
        // Keep current state silently on transient background poll failures
      }
    },
    [useRemoteDb, applyRemoteSnapshot, pushToast]
  );

  // Automatic 8-second polling + instant refresh when returning to the browser tab
  useEffect(() => {
    if (!useRemoteDb) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncNow(true);
      }
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncNow(true);
      }
    };
    const onFocus = () => syncNow(true);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [useRemoteDb, syncNow]);

  const setActiveMember = (name: string) => {
    setActiveMemberState(name);
    try {
      localStorage.setItem(DEVICE_MEMBER_KEY, name);
    } catch {
      // ignore
    }
  };

  const updateMembers = async (nextMembers: string[]) => {
    const cleaned = nextMembers.map((m) => m.trim()).filter(Boolean).slice(0, 6);
    if (cleaned.length === 0) return;

    setMembers(cleaned);
    writeLocalMembers(cleaned);
    if (!cleaned.includes(activeMember)) {
      setActiveMember(cleaned[0]);
    }

    if (!useRemoteDb) {
      pushToast({
        title: 'Members updated',
        description: cleaned.join(' & '),
        tone: 'blue',
      });
      return;
    }

    setSyncState('saving');
    try {
      const res = await financeApi.updateSettings({ members: cleaned });
      setMembers(res.members);
      writeLocalMembers(res.members);
      setSyncState('synced');
      pushToast({
        title: 'Shared members saved',
        description: res.members.join(' & '),
        tone: 'emerald',
      });
    } catch {
      setSyncState('synced');
    }
  };

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    writeLocalCurrency(c);
    if (!useRemoteDb) return;
    setSyncState('saving');
    financeApi
      .updateSettings({ currency: c })
      .then(() => setSyncState('synced'))
      .catch(() => setSyncState('local'));
  };

  const addEntry = async (entry: Omit<FinanceEntry, 'id'>) => {
    const withMember: Omit<FinanceEntry, 'id'> = {
      ...entry,
      recordedBy: entry.recordedBy || activeMember,
    };
    const tone =
      withMember.type === 'income'
        ? 'emerald'
        : withMember.type === 'investment'
          ? 'amber'
          : 'rose';

    if (useRemoteDb) {
      isMutatingRef.current = true;
      setSyncState('saving');
      try {
        const { entry: created } = await financeApi.createEntry(withMember);
        setEntries((prev) => {
          const next = [created, ...prev];
          entriesHashRef.current = JSON.stringify(next);
          writeLocalEntries(next);
          return next;
        });
        setSyncState('synced');
        setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        const label =
          created.type === 'income'
            ? 'Income synced to cloud DB'
            : created.type === 'investment'
              ? 'Investment synced to cloud DB'
              : 'Expense synced to cloud DB';
        pushToast({ title: label, description: created.title, tone });
        isMutatingRef.current = false;
        return;
      } catch {
        isMutatingRef.current = false;
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    const localCreated: FinanceEntry = {
      ...withMember,
      id: `ent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setEntries((prev) => {
      const next = [localCreated, ...prev];
      entriesHashRef.current = JSON.stringify(next);
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
      isMutatingRef.current = true;
      setSyncState('saving');
      try {
        const { entry: updated } = await financeApi.updateEntry(id, updates);
        setEntries((prev) => {
          const next = prev.map((e) => (e.id === id ? updated : e));
          entriesHashRef.current = JSON.stringify(next);
          writeLocalEntries(next);
          return next;
        });
        setSyncState('synced');
        pushToast({
          title: 'Entry updated',
          description: updated.title,
          tone: 'blue',
        });
        isMutatingRef.current = false;
        return;
      } catch {
        isMutatingRef.current = false;
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      entriesHashRef.current = JSON.stringify(next);
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
      isMutatingRef.current = true;
      setSyncState('saving');
      try {
        await financeApi.deleteEntry(id);
        setEntries((prev) => {
          const next = prev.filter((e) => e.id !== id);
          entriesHashRef.current = JSON.stringify(next);
          writeLocalEntries(next);
          return next;
        });
        setSyncState('synced');
        pushToast({
          title: 'Entry deleted',
          description: target?.title,
          tone: 'rose',
        });
        isMutatingRef.current = false;
        return;
      } catch {
        isMutatingRef.current = false;
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      entriesHashRef.current = JSON.stringify(next);
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
      isMutatingRef.current = true;
      setSyncState('saving');
      try {
        const { entry: updated } = await financeApi.reportPnL(id, payload);
        setEntries((prev) => {
          const next = prev.map((e) => (e.id === id ? updated : e));
          entriesHashRef.current = JSON.stringify(next);
          writeLocalEntries(next);
          return next;
        });
        setSyncState('synced');
        pushToast({
          title: isProfit ? 'Profit recorded' : 'Loss recorded',
          description: updated.title,
          tone: isProfit ? 'emerald' : 'rose',
        });
        isMutatingRef.current = false;
        return;
      } catch {
        isMutatingRef.current = false;
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
      entriesHashRef.current = JSON.stringify(next);
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
    const taggedSeed = SEED_ENTRIES.map((e, idx) => ({
      ...e,
      recordedBy: members[idx % members.length] || 'Person 1',
    }));
    if (useRemoteDb) {
      isMutatingRef.current = true;
      setSyncState('saving');
      try {
        const { entries: saved } = await financeApi.replaceAllEntries(taggedSeed);
        entriesHashRef.current = JSON.stringify(saved);
        setEntries(saved);
        writeLocalEntries(saved);
        setSyncState('synced');
        pushToast({
          title: 'Sample dataset loaded',
          description: 'Saved sample entries to your shared database',
          tone: 'blue',
        });
        isMutatingRef.current = false;
        return;
      } catch {
        isMutatingRef.current = false;
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    entriesHashRef.current = JSON.stringify(taggedSeed);
    setEntries(taggedSeed);
    writeLocalEntries(taggedSeed);
    pushToast({
      title: 'Sample dataset loaded',
      description: 'Loaded sample transactions across Sep – Nov 2026',
      tone: 'blue',
    });
  };

  const clearAllData = async () => {
    if (useRemoteDb) {
      isMutatingRef.current = true;
      setSyncState('saving');
      try {
        await financeApi.clearAllEntries();
        entriesHashRef.current = '[]';
        setEntries([]);
        writeLocalEntries([]);
        setSyncState('synced');
        pushToast({
          title: 'Shared database cleared',
          description: 'All numbers reset to 0 across devices',
          tone: 'amber',
        });
        isMutatingRef.current = false;
        return;
      } catch {
        isMutatingRef.current = false;
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    entriesHashRef.current = '[]';
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
      isMutatingRef.current = true;
      setSyncState('saving');
      try {
        const { entries: saved } = await financeApi.replaceAllEntries(nextEntries);
        entriesHashRef.current = JSON.stringify(saved);
        setEntries(saved);
        writeLocalEntries(saved);
        setSyncState('synced');
        pushToast({
          title: 'Backup restored',
          description: `Synced ${saved.length} entries to shared database`,
          tone: 'emerald',
        });
        isMutatingRef.current = false;
        return;
      } catch {
        isMutatingRef.current = false;
        setUseRemoteDb(false);
        setSyncState('local');
      }
    }

    entriesHashRef.current = JSON.stringify(nextEntries);
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
      members,
      activeMember,
      syncState,
      dbDriver,
      lastSyncedAt,
      setCurrency,
      setActiveMember,
      updateMembers,
      syncNow,
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
      members,
      activeMember,
      syncState,
      dbDriver,
      lastSyncedAt,
      syncNow,
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
