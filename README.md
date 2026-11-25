# Verdant — Full-Stack Financial, Investment & P&L Dashboard

A full-stack personal finance dashboard with a React + Tailwind CSS + Framer Motion frontend and an Express + SQLite/PostgreSQL backend that persists all your income, expenses, investment allocations, profit/loss reports, and currency preferences.

## Running Locally

```bash
npm install
npm run dev
```

- **Frontend UI:** `http://localhost:5173`
- **Backend API:** `http://localhost:4000`
- **Database (default):** `./data/verdant.sqlite` (automatically created on first run via Node's built-in SQLite)

## Deploying to Production

This project runs as a **single Node service** (`npm run build && npm start`) where Express serves both the `/api/*` backend and the compiled React dashboard (`dist/`).

### Option A: Render.com (Recommended — Free Managed PostgreSQL)
1. Push this folder to a GitHub repository.
2. On [Render](https://render.com), click **New → Blueprint** and select your repo (`render.yaml` is already configured!).
3. Render provisions a PostgreSQL database and automatically connects `DATABASE_URL` so every record is permanently stored.

### Option B: Railway / Fly.io / Neon / Supabase
1. Set `DATABASE_URL` to any PostgreSQL connection string (`postgres://...`).
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Tables (`entries`, `app_settings`) are automatically created on startup.

### Option C: Docker / Self-Hosted VPS
```bash
docker build -t verdant-finance .
docker run -p 4000:4000 -v verdant_data:/app/data verdant-finance
```

## REST API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check + active database driver (`sqlite` or `postgres`) |
| `GET` | `/api/entries` | List all income, expense, and investment records |
| `POST` | `/api/entries` | Record a new income, expense, or investment |
| `PATCH` | `/api/entries/:id` | Update an existing record |
| `PATCH` | `/api/entries/:id/pnl` | Report or update profit/loss on an expense or investment |
| `DELETE` | `/api/entries/:id` | Delete a record |
| `POST` | `/api/entries/bulk` | Bulk replace / import JSON backup |
| `DELETE` | `/api/entries` | Clear all records |
| `GET` / `PATCH` | `/api/settings` | Get / update saved currency preference |
| `GET` | `/api/export/json` | Download full database JSON backup |
