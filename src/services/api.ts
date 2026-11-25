import { CurrencyCode, FinanceEntry, PnLStatus } from '../types/finance';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore non-json error body
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export interface HealthResponse {
  ok: boolean;
  driver: 'sqlite' | 'postgres' | 'none';
  persistent: boolean;
  entryCount: number;
  timestamp: string;
}

export const financeApi = {
  health: () => request<HealthResponse>('/api/health'),

  listEntries: () =>
    request<{ entries: FinanceEntry[]; persistent?: boolean }>('/api/entries'),

  createEntry: (entry: Omit<FinanceEntry, 'id'>) =>
    request<{ entry: FinanceEntry }>('/api/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),

  updateEntry: (id: string, updates: Partial<FinanceEntry>) =>
    request<{ entry: FinanceEntry }>(`/api/entries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  reportPnL: (
    id: string,
    payload: {
      pnlAmount: number;
      currentValue: number;
      pnlStatus: PnLStatus;
      pnlNote?: string;
      pnlUpdatedAt?: string;
    }
  ) =>
    request<{ entry: FinanceEntry }>(
      `/api/entries/${encodeURIComponent(id)}/pnl`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  deleteEntry: (id: string) =>
    request<{ ok: boolean; id: string }>(
      `/api/entries/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),

  replaceAllEntries: (entries: FinanceEntry[]) =>
    request<{ entries: FinanceEntry[] }>('/api/entries/bulk', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    }),

  clearAllEntries: () =>
    request<{ ok: boolean; entries: FinanceEntry[] }>('/api/entries', {
      method: 'DELETE',
    }),

  getSettings: () => request<{ currency: CurrencyCode }>('/api/settings'),

  updateCurrency: (currency: CurrencyCode) =>
    request<{ currency: CurrencyCode }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ currency }),
    }),

  getJsonExportUrl: () => `${API_BASE}/api/export/json`,
};
