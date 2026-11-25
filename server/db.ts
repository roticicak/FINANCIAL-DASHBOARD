import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import { DbRow, EntryType, FinanceEntry, PnLStatus } from './types.js';

function rowToEntry(row: DbRow): FinanceEntry {
  let parsedTags: string[] | undefined;
  if (row.tags) {
    try {
      const t = JSON.parse(row.tags);
      if (Array.isArray(t)) parsedTags = t;
    } catch {
      parsedTags = undefined;
    }
  }

  return {
    id: row.id,
    type: row.type as EntryType,
    title: row.title,
    category: row.category,
    amount: Number(row.amount),
    date: row.date,
    notes: row.notes ?? undefined,
    tags: parsedTags,
    ticker: row.ticker ?? undefined,
    assetClass: row.asset_class ?? undefined,
    pnlTracked: Boolean(row.pnl_tracked),
    pnlStatus: (row.pnl_status as PnLStatus) || 'none',
    currentValue:
      row.current_value !== null && row.current_value !== undefined
        ? Number(row.current_value)
        : undefined,
    pnlAmount:
      row.pnl_amount !== null && row.pnl_amount !== undefined
        ? Number(row.pnl_amount)
        : undefined,
    pnlUpdatedAt: row.pnl_updated_at ?? undefined,
    pnlNote: row.pnl_note ?? undefined,
  };
}

export interface FinanceRepository {
  driver: 'sqlite' | 'postgres';
  init(): Promise<void>;
  listEntries(): Promise<FinanceEntry[]>;
  getEntry(id: string): Promise<FinanceEntry | null>;
  createEntry(entry: FinanceEntry): Promise<FinanceEntry>;
  updateEntry(id: string, updates: Partial<FinanceEntry>): Promise<FinanceEntry | null>;
  deleteEntry(id: string): Promise<boolean>;
  replaceAllEntries(entries: FinanceEntry[]): Promise<FinanceEntry[]>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

// ======================== SQLITE DRIVER (Built-in node:sqlite) ========================
class SqliteRepository implements FinanceRepository {
  driver: 'sqlite' = 'sqlite';
  private db: DatabaseSync;

  constructor(dbPath: string) {
    const resolved = path.resolve(dbPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    this.db = new DatabaseSync(resolved);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  async init(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        tags TEXT,
        ticker TEXT,
        asset_class TEXT,
        pnl_tracked INTEGER NOT NULL DEFAULT 0,
        pnl_status TEXT DEFAULT 'none',
        current_value REAL,
        pnl_amount REAL,
        pnl_updated_at TEXT,
        pnl_note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date DESC);
      CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  async listEntries(): Promise<FinanceEntry[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM entries ORDER BY date DESC, created_at DESC'
    );
    const rows = stmt.all() as unknown as DbRow[];
    return rows.map(rowToEntry);
  }

  async getEntry(id: string): Promise<FinanceEntry | null> {
    const stmt = this.db.prepare('SELECT * FROM entries WHERE id = ?');
    const row = stmt.get(id) as unknown as DbRow | undefined;
    return row ? rowToEntry(row) : null;
  }

  async createEntry(entry: FinanceEntry): Promise<FinanceEntry> {
    const stmt = this.db.prepare(`
      INSERT INTO entries (
        id, type, title, category, amount, date, notes, tags,
        ticker, asset_class, pnl_tracked, pnl_status,
        current_value, pnl_amount, pnl_updated_at, pnl_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.id,
      entry.type,
      entry.title,
      entry.category,
      entry.amount,
      entry.date,
      entry.notes ?? null,
      entry.tags ? JSON.stringify(entry.tags) : null,
      entry.ticker ?? null,
      entry.assetClass ?? null,
      entry.pnlTracked ? 1 : 0,
      entry.pnlStatus ?? 'none',
      entry.currentValue ?? null,
      entry.pnlAmount ?? null,
      entry.pnlUpdatedAt ?? null,
      entry.pnlNote ?? null
    );

    return (await this.getEntry(entry.id))!;
  }

  async updateEntry(
    id: string,
    updates: Partial<FinanceEntry>
  ): Promise<FinanceEntry | null> {
    const existing = await this.getEntry(id);
    if (!existing) return null;

    const merged: FinanceEntry = { ...existing, ...updates, id };
    const stmt = this.db.prepare(`
      UPDATE entries SET
        type = ?, title = ?, category = ?, amount = ?, date = ?,
        notes = ?, tags = ?, ticker = ?, asset_class = ?,
        pnl_tracked = ?, pnl_status = ?, current_value = ?,
        pnl_amount = ?, pnl_updated_at = ?, pnl_note = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      merged.type,
      merged.title,
      merged.category,
      merged.amount,
      merged.date,
      merged.notes ?? null,
      merged.tags ? JSON.stringify(merged.tags) : null,
      merged.ticker ?? null,
      merged.assetClass ?? null,
      merged.pnlTracked ? 1 : 0,
      merged.pnlStatus ?? 'none',
      merged.currentValue ?? null,
      merged.pnlAmount ?? null,
      merged.pnlUpdatedAt ?? null,
      merged.pnlNote ?? null,
      id
    );

    return this.getEntry(id);
  }

  async deleteEntry(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM entries WHERE id = ?');
    const info = stmt.run(id);
    return Number(info.changes) > 0;
  }

  async replaceAllEntries(entries: FinanceEntry[]): Promise<FinanceEntry[]> {
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.exec('DELETE FROM entries');
      for (const e of entries) {
        await this.createEntry(e);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return this.listEntries();
  }

  async getSetting(key: string): Promise<string | null> {
    const stmt = this.db.prepare('SELECT value FROM app_settings WHERE key = ?');
    const row = stmt.get(key) as unknown as { value: string } | undefined;
    return row ? row.value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);
    stmt.run(key, value);
  }
}

// ======================== POSTGRESQL DRIVER (Cloud Deployments) ========================
class PostgresRepository implements FinanceRepository {
  driver: 'postgres' = 'postgres';
  private pool: Pool;

  constructor(connectionString: string) {
    const isLocal =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('sslmode=disable');

    this.pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        tags TEXT,
        ticker TEXT,
        asset_class TEXT,
        pnl_tracked BOOLEAN NOT NULL DEFAULT FALSE,
        pnl_status TEXT DEFAULT 'none',
        current_value DOUBLE PRECISION,
        pnl_amount DOUBLE PRECISION,
        pnl_updated_at TEXT,
        pnl_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date DESC);
      CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async listEntries(): Promise<FinanceEntry[]> {
    const { rows } = await this.pool.query<DbRow>(
      'SELECT * FROM entries ORDER BY date DESC, created_at DESC'
    );
    return rows.map(rowToEntry);
  }

  async getEntry(id: string): Promise<FinanceEntry | null> {
    const { rows } = await this.pool.query<DbRow>(
      'SELECT * FROM entries WHERE id = $1',
      [id]
    );
    return rows[0] ? rowToEntry(rows[0]) : null;
  }

  async createEntry(entry: FinanceEntry): Promise<FinanceEntry> {
    const { rows } = await this.pool.query<DbRow>(
      `
      INSERT INTO entries (
        id, type, title, category, amount, date, notes, tags,
        ticker, asset_class, pnl_tracked, pnl_status,
        current_value, pnl_amount, pnl_updated_at, pnl_note
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
      `,
      [
        entry.id,
        entry.type,
        entry.title,
        entry.category,
        entry.amount,
        entry.date,
        entry.notes ?? null,
        entry.tags ? JSON.stringify(entry.tags) : null,
        entry.ticker ?? null,
        entry.assetClass ?? null,
        Boolean(entry.pnlTracked),
        entry.pnlStatus ?? 'none',
        entry.currentValue ?? null,
        entry.pnlAmount ?? null,
        entry.pnlUpdatedAt ?? null,
        entry.pnlNote ?? null,
      ]
    );
    return rowToEntry(rows[0]);
  }

  async updateEntry(
    id: string,
    updates: Partial<FinanceEntry>
  ): Promise<FinanceEntry | null> {
    const existing = await this.getEntry(id);
    if (!existing) return null;

    const merged: FinanceEntry = { ...existing, ...updates, id };
    const { rows } = await this.pool.query<DbRow>(
      `
      UPDATE entries SET
        type = $1, title = $2, category = $3, amount = $4, date = $5,
        notes = $6, tags = $7, ticker = $8, asset_class = $9,
        pnl_tracked = $10, pnl_status = $11, current_value = $12,
        pnl_amount = $13, pnl_updated_at = $14, pnl_note = $15,
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
      `,
      [
        merged.type,
        merged.title,
        merged.category,
        merged.amount,
        merged.date,
        merged.notes ?? null,
        merged.tags ? JSON.stringify(merged.tags) : null,
        merged.ticker ?? null,
        merged.assetClass ?? null,
        Boolean(merged.pnlTracked),
        merged.pnlStatus ?? 'none',
        merged.currentValue ?? null,
        merged.pnlAmount ?? null,
        merged.pnlUpdatedAt ?? null,
        merged.pnlNote ?? null,
        id,
      ]
    );
    return rows[0] ? rowToEntry(rows[0]) : null;
  }

  async deleteEntry(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM entries WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async replaceAllEntries(entries: FinanceEntry[]): Promise<FinanceEntry[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM entries');
      for (const entry of entries) {
        await client.query(
          `
          INSERT INTO entries (
            id, type, title, category, amount, date, notes, tags,
            ticker, asset_class, pnl_tracked, pnl_status,
            current_value, pnl_amount, pnl_updated_at, pnl_note
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16
          )
          `,
          [
            entry.id,
            entry.type,
            entry.title,
            entry.category,
            entry.amount,
            entry.date,
            entry.notes ?? null,
            entry.tags ? JSON.stringify(entry.tags) : null,
            entry.ticker ?? null,
            entry.assetClass ?? null,
            Boolean(entry.pnlTracked),
            entry.pnlStatus ?? 'none',
            entry.currentValue ?? null,
            entry.pnlAmount ?? null,
            entry.pnlUpdatedAt ?? null,
            entry.pnlNote ?? null,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return this.listEntries();
  }

  async getSetting(key: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = $1',
      [key]
    );
    return rows[0]?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `,
      [key, value]
    );
  }
}

export function createRepository(): FinanceRepository {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    return new PostgresRepository(databaseUrl);
  }
  const sqlitePath = process.env.SQLITE_PATH?.trim() || './data/verdant.sqlite';
  return new SqliteRepository(sqlitePath);
}
