import express, { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { app, ensureDbReady, repo } from './app.js';

const PORT = Number(process.env.PORT || 4000);

// Serve built Vite frontend in standalone Node / Docker / Render / Railway deployments
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

async function start() {
  await ensureDbReady();
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
