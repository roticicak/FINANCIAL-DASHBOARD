import {
  CURRENCIES,
  CurrencyCode,
  FinanceEntry,
  PeriodSummary,
} from '../types/finance';

export function formatMoney(
  usdAmount: number,
  currency: CurrencyCode,
  options?: { compact?: boolean; showSign?: boolean }
): string {
  const cfg = CURRENCIES[currency];
  const converted = usdAmount * cfg.rateFromUSD;
  const abs = Math.abs(converted);
  const sign =
    converted < 0 ? '-' : options?.showSign && converted > 0 ? '+' : '';

  if (options?.compact && abs >= 1000) {
    const formatted = new Intl.NumberFormat(cfg.locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(abs);
    return `${sign}${cfg.symbol}${formatted}`;
  }

  const formatted = new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(abs);

  return `${sign}${cfg.symbol}${formatted}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatShortDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Get Monday of the ISO week for a given date
export function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday = 1
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}

export function getISOWeekNumber(date: Date): number {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getWeekKey(dateStr: string): string {
  const d = parseDate(dateStr);
  const start = getWeekStart(d);
  const weekNum = getISOWeekNumber(start);
  return `${start.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

function computeHealth(
  income: number,
  expenses: number,
  investments: number,
  netPnL: number
): { grade: PeriodSummary['healthGrade']; label: string } {
  if (income === 0 && expenses === 0 && investments === 0) {
    return { grade: 'B', label: 'No Activity Yet' };
  }
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : -50;
  const investRate = income > 0 ? (investments / income) * 100 : 0;
  const pnlBonus = netPnL > 0 ? 12 : netPnL < 0 ? -8 : 0;
  const score = savingsRate * 0.7 + investRate * 0.6 + pnlBonus;

  if (score >= 48) return { grade: 'A+', label: 'Peak Wealth Velocity' };
  if (score >= 34) return { grade: 'A', label: 'Strong Surplus & Growth' };
  if (score >= 22) return { grade: 'B+', label: 'Healthy Balance' };
  if (score >= 8) return { grade: 'B', label: 'Steady Cash Flow' };
  return { grade: 'C', label: 'Watch Burn Rate' };
}

function buildInsights(
  periodType: 'week' | 'month',
  income: number,
  expenses: number,
  investments: number,
  totalProfit: number,
  totalLoss: number,
  netPnL: number,
  topExpense: { category: string; amount: number } | null
): string[] {
  const insights: string[] = [];
  const noun = periodType === 'week' ? 'week' : 'month';
  const netCash = income - expenses;

  if (income > 0) {
    const savingsRate = ((income - expenses) / income) * 100;
    if (savingsRate >= 35) {
      insights.push(
        `Strong discipline: you retained ${savingsRate.toFixed(1)}% of your income before investments this ${noun}.`
      );
    } else if (savingsRate >= 15) {
      insights.push(
        `Solid cash retention at ${savingsRate.toFixed(1)}% of income with a positive operating buffer.`
      );
    } else if (netCash < 0) {
      insights.push(
        `Expenses exceeded income this ${noun} — review discretionary spend or timing of upcoming inflows.`
      );
    }
  } else if (expenses > 0) {
    insights.push(
      `No income was logged this ${noun}; expenses were funded from prior cash reserves.`
    );
  }

  if (investments > 0) {
    const pct = income > 0 ? ` (${((investments / income) * 100).toFixed(0)}% of inflows)` : '';
    insights.push(
      `Capital deployed into investments${pct} keeps long-term compounding on track.`
    );
  }

  if (totalProfit > 0 || totalLoss > 0) {
    if (netPnL > 0) {
      insights.push(
        `Reported P&L finished in net profit — winning positions outweighed losses by ${
          totalLoss > 0 ? `${(totalProfit / totalLoss).toFixed(1)}x` : '100%'
        }.`
      );
    } else if (netPnL < 0) {
      insights.push(
        `Reported P&L closed net negative this ${noun}; inspect losing expense/investment tickets to tighten risk.`
      );
    }
  }

  if (topExpense) {
    insights.push(
      `Largest expense driver was ${topExpense.category}, representing ${
        expenses > 0 ? `${((topExpense.amount / expenses) * 100).toFixed(0)}%` : '0%'
      } of spending.`
    );
  }

  return insights.slice(0, 4);
}

function summarizeEntries(
  key: string,
  label: string,
  shortLabel: string,
  startDate: string,
  endDate: string,
  entries: FinanceEntry[],
  periodType: 'week' | 'month',
  breakdownBuckets: PeriodSummary['breakdownBuckets']
): PeriodSummary {
  let income = 0;
  let expenses = 0;
  let investments = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  const expenseByCategory: Record<string, number> = {};
  let topPnLItem: FinanceEntry | null = null;

  for (const e of entries) {
    if (e.type === 'income') income += e.amount;
    if (e.type === 'expense') {
      expenses += e.amount;
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    }
    if (e.type === 'investment') investments += e.amount;

    if (e.pnlTracked && typeof e.pnlAmount === 'number') {
      if (e.pnlAmount > 0) totalProfit += e.pnlAmount;
      if (e.pnlAmount < 0) totalLoss += Math.abs(e.pnlAmount);
      if (
        !topPnLItem ||
        Math.abs(e.pnlAmount) > Math.abs(topPnLItem.pnlAmount || 0)
      ) {
        topPnLItem = e;
      }
    }
  }

  const topCatEntry = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];
  const topExpenseCategory = topCatEntry
    ? { category: topCatEntry[0], amount: topCatEntry[1] }
    : null;

  const netPnL = totalProfit - totalLoss;
  const netCashFlow = income - expenses;
  const netAfterInvestments = income - expenses - investments;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const investmentRate = income > 0 ? (investments / income) * 100 : 0;
  const { grade, label: healthLabel } = computeHealth(
    income,
    expenses,
    investments,
    netPnL
  );

  return {
    key,
    label,
    shortLabel,
    startDate,
    endDate,
    income,
    expenses,
    investments,
    totalOutflow: expenses + investments,
    netCashFlow,
    netAfterInvestments,
    totalProfit,
    totalLoss,
    netPnL,
    savingsRate,
    investmentRate,
    entryCount: entries.length,
    entries,
    topExpenseCategory,
    topPnLItem,
    healthGrade: grade,
    healthLabel,
    breakdownBuckets,
    insights: buildInsights(
      periodType,
      income,
      expenses,
      investments,
      totalProfit,
      totalLoss,
      netPnL,
      topExpenseCategory
    ),
  };
}

export function getWeeklySummaries(entries: FinanceEntry[]): PeriodSummary[] {
  const weekMap = new Map<string, { start: Date; end: Date; items: FinanceEntry[] }>();

  // Ensure current week (based on latest entry or today) is always present
  const anchorDate =
    entries.length > 0
      ? parseDate([...entries].sort((a, b) => b.date.localeCompare(a.date))[0].date)
      : new Date();
  const anchorStart = getWeekStart(anchorDate);
  const anchorKey = `${anchorStart.getFullYear()}-W${String(
    getISOWeekNumber(anchorStart)
  ).padStart(2, '0')}`;
  weekMap.set(anchorKey, {
    start: anchorStart,
    end: getWeekEnd(anchorStart),
    items: [],
  });

  for (const entry of entries) {
    const d = parseDate(entry.date);
    const start = getWeekStart(d);
    const end = getWeekEnd(start);
    const key = `${start.getFullYear()}-W${String(getISOWeekNumber(start)).padStart(
      2,
      '0'
    )}`;
    if (!weekMap.has(key)) {
      weekMap.set(key, { start, end, items: [] });
    }
    weekMap.get(key)!.items.push(entry);
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return Array.from(weekMap.entries())
    .sort((a, b) => b[1].start.getTime() - a[1].start.getTime())
    .map(([key, { start, end, items }]) => {
      const startLabel = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const endLabel = end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const shortWeek = key.split('-')[1];

      const buckets = dayNames.map((dayLabel, idx) => {
        const dayDate = new Date(start);
        dayDate.setDate(start.getDate() + idx);
        const iso = toDateISO(dayDate);
        const dayItems = items.filter((it) => it.date === iso);
        return {
          label: dayLabel,
          income: dayItems
            .filter((x) => x.type === 'income')
            .reduce((s, x) => s + x.amount, 0),
          expenses: dayItems
            .filter((x) => x.type === 'expense')
            .reduce((s, x) => s + x.amount, 0),
          investments: dayItems
            .filter((x) => x.type === 'investment')
            .reduce((s, x) => s + x.amount, 0),
          netPnL: dayItems
            .filter((x) => x.pnlTracked)
            .reduce((s, x) => s + (x.pnlAmount || 0), 0),
        };
      });

      return summarizeEntries(
        key,
        `${startLabel} – ${endLabel}`,
        `${shortWeek} · ${startLabel}`,
        toDateISO(start),
        toDateISO(end),
        items,
        'week',
        buckets
      );
    });
}

export function getMonthlySummaries(entries: FinanceEntry[]): PeriodSummary[] {
  const monthMap = new Map<string, FinanceEntry[]>();

  if (entries.length === 0) {
    const nowKey = toDateISO(new Date()).slice(0, 7);
    monthMap.set(nowKey, []);
  }

  for (const entry of entries) {
    const key = getMonthKey(entry.date);
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(entry);
  }

  return Array.from(monthMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => {
      const [y, m] = key.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      const label = start.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      const shortLabel = start.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      // Break month into 4–5 weekly buckets (Days 1–7, 8–14, 15–21, 22–31)
      const ranges = [
        { label: 'Wk 1 (1–7)', min: 1, max: 7 },
        { label: 'Wk 2 (8–14)', min: 8, max: 14 },
        { label: 'Wk 3 (15–21)', min: 15, max: 21 },
        { label: 'Wk 4 (22–31)', min: 22, max: 31 },
      ];

      const buckets = ranges.map((r) => {
        const bucketItems = items.filter((it) => {
          const day = Number(it.date.split('-')[2]);
          return day >= r.min && day <= r.max;
        });
        return {
          label: r.label,
          income: bucketItems
            .filter((x) => x.type === 'income')
            .reduce((s, x) => s + x.amount, 0),
          expenses: bucketItems
            .filter((x) => x.type === 'expense')
            .reduce((s, x) => s + x.amount, 0),
          investments: bucketItems
            .filter((x) => x.type === 'investment')
            .reduce((s, x) => s + x.amount, 0),
          netPnL: bucketItems
            .filter((x) => x.pnlTracked)
            .reduce((s, x) => s + (x.pnlAmount || 0), 0),
        };
      });

      return summarizeEntries(
        key,
        label,
        shortLabel,
        toDateISO(start),
        toDateISO(end),
        items,
        'month',
        buckets
      );
    });
}

export function exportEntriesToCSV(entries: FinanceEntry[], filename: string) {
  const headers = [
    'ID',
    'Date',
    'Type',
    'Title',
    'Category',
    'Amount (USD)',
    'Ticker',
    'P&L Tracked',
    'P&L Status',
    'Current/Exit Value (USD)',
    'Profit/Loss (USD)',
    'Notes',
  ];

  const rows = entries.map((e) => [
    e.id,
    e.date,
    e.type,
    `"${(e.title || '').replace(/"/g, '""')}"`,
    `"${(e.category || '').replace(/"/g, '""')}"`,
    e.amount.toFixed(2),
    e.ticker || '',
    e.pnlTracked ? 'Yes' : 'No',
    e.pnlStatus || 'none',
    e.currentValue !== undefined ? e.currentValue.toFixed(2) : '',
    e.pnlAmount !== undefined ? e.pnlAmount.toFixed(2) : '',
    `"${(e.pnlNote || e.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
