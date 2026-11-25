export type EntryType = 'income' | 'expense' | 'investment';
export type PnLStatus = 'none' | 'open' | 'realized';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'IDR' | 'SGD';

export interface FinanceEntry {
  id: string;
  type: EntryType;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  tags?: string[];
  ticker?: string;
  assetClass?: string;
  recordedBy?: string;
  pnlTracked?: boolean;
  pnlStatus?: PnLStatus;
  currentValue?: number;
  pnlAmount?: number;
  pnlUpdatedAt?: string;
  pnlNote?: string;
}

export interface DbRow {
  id: string;
  type: string;
  title: string;
  category: string;
  amount: number | string;
  date: string;
  notes: string | null;
  tags: string | null;
  ticker: string | null;
  asset_class: string | null;
  recorded_by: string | null;
  pnl_tracked: number | boolean;
  pnl_status: string | null;
  current_value: number | string | null;
  pnl_amount: number | string | null;
  pnl_updated_at: string | null;
  pnl_note: string | null;
}
