import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRepository } from './db.js';
import { CurrencyCode, EntryType, FinanceEntry, PnLStatus } from './types.js';

const PORT = Number(process.env.PORT || 4000);
const VALID_TYPES: EntryType[] = ['income', 'expense', 'investment'];
const VALID_PNL_STATUS: PnLStatus[] = ['none', 'open', 'realized'];
const VALID_CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'IDR', 'SGD'];

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const repo = createRepository();

function validateEntryPayload(body: Record<string, unknown>): {
  error?: string;
  entry?: Omit<FinanceEntry, 'id'>;
} {
  const type = body.type as EntryType;
  if (!VALID_TYPES.includes(type)) {
    return { error: 'Invalid entry type. Must be income, expense, or investment.' };
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return { error: 'Title is required.' };

  const category = typeof body.category === 'string' ? body.category.trim() : '';
  if (!category) return { error: 'Category is required.' };

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Amount must be a positive number.' };
  }

  const date = typeof body.date === 'string' ? body.date.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'Date must be in YYYY-MM-DD format.' };
  }

  const pnlTracked = Boolean(body.pnlTracked);
  const pnlStatus = VALID_PNL_STATUS.includes(body.pnlStatus as PnLStatus)
    ? (body.pnlStatus as PnLStatus)
    : pnlTracked
      ? type === 'investment'
        ? 'open'
        : 'realized'
      : 'none';

  const currentValue =
    body.currentValue !== undefined && body.currentValue !== null && body.currentValue !== ''
      ? Number(body.currentValue)
      : undefined;

  const pnlAmount =
    body.pnlAmount !== undefined && body.pnlAmount !== null && body.pnlAmount !== ''
      ? Number(body.pnlAmount)
      : undefined;

  return {
    entry: {
      type,
      title,
      category,
      amount: Number(amount.toFixed(2)),
      date,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined,
      tags: Array.isArray(body.tags)
        ? body.tags.filter((t): t is string => typeof t === 'string')
        : undefined,
      ticker:
        typeof body.ticker === 'string' && body.ticker.trim()
          ? body.ticker.trim().toUpperCase()
          : undefined,
      assetClass:
        typeof body.assetClass === 'string' && body.assetClass.trim()
          ? body.assetClass.trim()
          : undefined,
      pnlTracked,
      pnlStatus,
      currentValue:
        currentValue !== undefined && Number.isFinite(currentValue)
          ? Number(currentValue.toFixed(2))
          : undefined,
      pnlAmount:
        pnlAmount !== undefined && Number.isFinite(pnlAmount)
          ? Number(pnlAmount.toFixed(2))
          : undefined,
      pnlUpdatedAt:
        typeof body.pnlUpdatedAt === 'string' && body.pnlUpdatedAt.trim()
          ? body.pnlUpdatedAt.trim()
          : undefined,
      pnlNote:
        typeof body.pnlNote === 'string' && body.pnlNote.trim()
          ? body.pnlNote.trim()
          : undefined,
    },
  };
}

// ======================== REST API ROUTES ========================

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const entries = await repo.listEntries();
    res.json({
      ok: true,
      driver: repo.driver,
      entryCount: entries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ ok: false, error: 'Database connection failed' });
  }
});

app.get('/api/entries', async (_req: Request, res: Response) => {
  try {
    const entries = await repo.listEntries();
    res.json({ entries });
  } catch (err) {
    console.error('GET /api/entries failed:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

app.post('/api/entries', async (req: Request, res: Response) => {
  try {
    const { error, entry } = validateEntryPayload(req.body || {});
    if (error || !entry) {
      res.status(400).json({ error });
      return;
    }

    const id = `ent-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const created = await repo.createEntry({ ...entry, id });
    res.status(201).json({ entry: created });
  } catch (err) {
    console.error('POST /api/entries failed:', err);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

app.patch('/api/entries/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await repo.getEntry(id);
    if (!existing) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    const mergedRaw = { ...existing, ...(req.body || {}) };
    const { error, entry } = validateEntryPayload(mergedRaw);
    if (error || !entry) {
      res.status(400).json({ error });
      return;
    }

    const updated = await repo.updateEntry(id, entry);
    res.json({ entry: updated });
  } catch (err) {
    console.error('PATCH /api/entries/:id failed:', err);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

app.patch('/api/entries/:id/pnl', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await repo.getEntry(id);
    if (!existing) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    const pnlAmount = Number(req.body?.pnlAmount);
    const currentValue = Number(req.body?.currentValue);
    if (!Number.isFinite(pnlAmount) || !Number.isFinite(currentValue)) {
      res.status(400).json({ error: 'pnlAmount and currentValue must be valid numbers.' });
      return;
    }

    const pnlStatus = VALID_PNL_STATUS.includes(req.body?.pnlStatus)
      ? (req.body.pnlStatus as PnLStatus)
      : 'realized';

    const pnlNote =
      typeof req.body?.pnlNote === 'string' && req.body.pnlNote.trim()
        ? req.body.pnlNote.trim()
        : existing.pnlNote;

    const pnlUpdatedAt =
      typeof req.body?.pnlUpdatedAt === 'string' && req.body.pnlUpdatedAt.trim()
        ? req.body.pnlUpdatedAt.trim()
        : new Date().toISOString().slice(0, 10);

    const updated = await repo.updateEntry(id, {
      pnlTracked: true,
      pnlStatus,
      pnlAmount: Number(pnlAmount.toFixed(2)),
      currentValue: Number(currentValue.toFixed(2)),
      pnlNote,
      pnlUpdatedAt,
    });

    res.json({ entry: updated });
  } catch (err) {
    console.error('PATCH /api/entries/:id/pnl failed:', err);
    res.status(500).json({ error: 'Failed to report P&L' });
  }
});

app.delete('/api/entries/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const deleted = await repo.deleteEntry(id);
    if (!deleted) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.json({ ok: true, id });
  } catch (err) {
    console.error('DELETE /api/entries/:id failed:', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Bulk replace (used for Restore Sample Data or JSON backup restore)
app.post('/api/entries/bulk', async (req: Request, res: Response) => {
  try {
    const list = req.body?.entries;
    if (!Array.isArray(list)) {
      res.status(400).json({ error: 'Body must contain an entries array.' });
      return;
    }

    const validated: FinanceEntry[] = [];
    for (const raw of list) {
      const { error, entry } = validateEntryPayload(raw || {});
      if (error || !entry) {
        res.status(400).json({ error: `Invalid bulk entry: ${error}` });
        return;
      }
      const id =
        typeof raw.id === 'string' && raw.id.trim()
          ? raw.id.trim()
          : `ent-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      validated.push({ ...entry, id });
    }

    const saved = await repo.replaceAllEntries(validated);
    res.json({ entries: saved });
  } catch (err) {
    console.error('POST /api/entries/bulk failed:', err);
    res.status(500).json({ error: 'Failed to bulk save entries' });
  }
});

// Clear all entries
app.delete('/api/entries', async (_req: Request, res: Response) => {
  try {
    await repo.replaceAllEntries([]);
    res.json({ ok: true, entries: [] });
  } catch (err) {
    console.error('DELETE /api/entries failed:', err);
    res.status(500).json({ error: 'Failed to clear entries' });
  }
});

// App settings (currency persistence)
app.get('/api/settings', async (_req: Request, res: Response) => {
  try {
    const currency = (await repo.getSetting('currency')) || 'USD';
    res.json({ currency });
  } catch (err) {
    console.error('GET /api/settings failed:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.patch('/api/settings', async (req: Request, res: Response) => {
  try {
    const currency = req.body?.currency as CurrencyCode;
    if (!VALID_CURRENCIES.includes(currency)) {
      res.status(400).json({ error: 'Unsupported currency code.' });
      return;
    }
    await repo.setSetting('currency', currency);
    res.json({ currency });
  } catch (err) {
    console.error('PATCH /api/settings failed:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// JSON Backup Download
app.get('/api/export/json', async (_req: Request, res: Response) => {
  try {
    const entries = await repo.listEntries();
    const currency = (await repo.getSetting('currency')) || 'USD';
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="verdant-backup-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.send(JSON.stringify({ exportedAt: new Date().toISOString(), currency, entries }, null, 2));
  } catch (err) {
    console.error('GET /api/export/json failed:', err);
    res.status(500).json({ error: 'Failed to export backup' });
  }
});

// ======================== PRODUCTION FRONTEND HOSTING ========================
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('/{*splat}', (req: Request, res: Response) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'API route not found' });
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// ======================== BOOTSTRAP ========================
async function start() {
  await repo.init();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Verdant API] Running on http://localhost:${PORT} · Database driver: ${repo.driver.toUpperCase()}`
    );
  });
}

start().catch((err) => {
  console.error('[Verdant API] Fatal startup error:', err);
  process.exit(1);
});
