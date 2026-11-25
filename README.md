# Verdant — Full-Stack Financial, Investment & P&L Dashboard

A full-stack personal finance dashboard with a React + Tailwind CSS + Framer Motion frontend and an Express + SQLite/PostgreSQL backend that works out of the box on **Vercel**, **Render**, **Railway**, **Docker**, and locally.

## Running Locally

```bash
npm install
npm run dev
```

- **Frontend UI:** `http://localhost:5173`
- **Backend API:** `http://localhost:4000`
- **Database (default):** `./data/verdant.sqlite` (automatically created on first run)

## Deploying on Vercel (Recommended)

Vercel deployment is pre-configured via `vercel.json` and `api/index.ts`!

1. Push this project to GitHub and import it in [Vercel](https://vercel.com).
2. **Even without a database attached yet**, every input you make is immediately recorded and saved locally in your browser (`Local Saved` badge).
3. **For permanent cloud database sync across all devices (2 minutes, Free):**
   - In your Vercel project dashboard, go to the **Storage** tab → click **Create Database** → choose **Neon (Serverless Postgres)** or **Supabase**.
   - Connect it to your project — Vercel automatically adds `DATABASE_URL` / `POSTGRES_URL` to your Environment Variables.
   - Click **Redeploy**.
   - Your tables (`entries`, `app_settings`) are created automatically on the first request, and the header badge switches to green **`PostgreSQL`**!

## Deploying on Render / Railway / Docker

- **Render:** Connect repo as a Blueprint (`render.yaml` auto-provisions PostgreSQL + Web Service).
- **Docker:**
  ```bash
  docker build -t verdant-finance .
  docker run -p 4000:4000 -v verdant_data:/app/data verdant-finance
  ```
