export type EntryType = 'income' | 'expense' | 'investment';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'IDR' | 'SGD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  rateFromUSD: number;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US', rateFromUSD: 1, decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', rateFromUSD: 0.92, decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', rateFromUSD: 0.79, decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', locale: 'en-SG', rateFromUSD: 1.34, decimals: 2 },
  IDR: { code: 'IDR', symbol: 'Rp', locale: 'id-ID', rateFromUSD: 15800, decimals: 0 },
};

export type PnLStatus = 'none' | 'open' | 'realized';

export interface FinanceEntry {
  id: string;
  type: EntryType;
  title: string;
  category: string;
  amount: number; // Always stored in base USD; for expense/investment this is the cost/capital spent
  date: string; // YYYY-MM-DD
  notes?: string;
  tags?: string[];
  // Investment-specific fields
  ticker?: string;
  assetClass?: string;
  // Profit & Loss tracking (works for BOTH expenses and investments!)
  // If pnlTracked is true:
  //   - currentOrExitValue represents the recovered/current/exit value (optional if pnlAmount is set directly)
  //   - pnlAmount = net profit (>0) or loss (<0) reported on this expense or investment
  pnlTracked?: boolean;
  pnlStatus?: PnLStatus;
  currentValue?: number; // Value realized or current valuation (cost + pnlAmount)
  pnlAmount?: number; // Positive = Profit, Negative = Loss
  pnlUpdatedAt?: string; // YYYY-MM-DD when P&L was reported/updated
  pnlNote?: string;
}

export const INCOME_CATEGORIES = [
  'Salary & Payroll',
  'Freelance & Consulting',
  'Business Revenue',
  'Dividends & Yield',
  'Bonus & Commission',
  'Rental & Royalties',
  'Other Income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Housing & Rent',
  'Food & Dining',
  'Business & Ads',
  'Inventory & Flip',
  'Software & Tools',
  'Transport & Travel',
  'Utilities & Bills',
  'Health & Wellness',
  'Lifestyle & Shopping',
  'Other Expense',
] as const;

export const INVESTMENT_CATEGORIES = [
  'Stocks & ETFs',
  'Index Funds',
  'Crypto & Digital',
  'Bonds & Treasury',
  'Real Estate / REIT',
  'Startup / Angel',
  'Commodities & Gold',
  'High-Yield Savings',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'Salary & Payroll': '#059669',
  'Freelance & Consulting': '#10B981',
  'Business Revenue': '#0D9488',
  'Dividends & Yield': '#14B8A6',
  'Bonus & Commission': '#34D399',
  'Rental & Royalties': '#0284C7',
  'Other Income': '#22C55E',

  'Housing & Rent': '#F43F5E',
  'Food & Dining': '#FB7185',
  'Business & Ads': '#2563EB',
  'Inventory & Flip': '#7C3AED',
  'Software & Tools': '#0EA5E9',
  'Transport & Travel': '#F97316',
  'Utilities & Bills': '#64748B',
  'Health & Wellness': '#EC4899',
  'Lifestyle & Shopping': '#E11D48',
  'Other Expense': '#94A3B8',

  'Stocks & ETFs': '#F59E0B',
  'Index Funds': '#D97706',
  'Crypto & Digital': '#8B5CF6',
  'Bonds & Treasury': '#0284C7',
  'Real Estate / REIT': '#10B981',
  'Startup / Angel': '#EA580C',
  'Commodities & Gold': '#EAB308',
  'High-Yield Savings': '#06B6D4',
};

export interface PeriodSummary {
  key: string; // e.g. '2026-W48' or '2026-11'
  label: string; // e.g. 'Nov 23 – Nov 29, 2026' or 'November 2026'
  shortLabel: string; // e.g. 'W48 · Nov 23' or 'Nov 2026'
  startDate: string;
  endDate: string;
  income: number;
  expenses: number;
  investments: number;
  totalOutflow: number;
  netCashFlow: number; // income - expenses
  netAfterInvestments: number; // income - expenses - investments
  totalProfit: number; // sum of positive pnlAmount in period
  totalLoss: number; // sum of abs(negative pnlAmount) in period
  netPnL: number; // totalProfit - totalLoss
  savingsRate: number; // ((income - expenses) / income) * 100
  investmentRate: number; // (investments / income) * 100
  entryCount: number;
  entries: FinanceEntry[];
  topExpenseCategory: { category: string; amount: number } | null;
  topPnLItem: FinanceEntry | null;
  healthGrade: 'A+' | 'A' | 'B+' | 'B' | 'C';
  healthLabel: string;
  breakdownBuckets: {
    label: string;
    income: number;
    expenses: number;
    investments: number;
    netPnL: number;
  }[];
  insights: string[];
}

export type ActiveTab = 'overview' | 'cashflow' | 'investments' | 'pnl' | 'summaries';
