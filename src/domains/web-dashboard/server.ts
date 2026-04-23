/**
 * Express server for config dashboard
 * Lazy-loaded only when `config ui` runs — zero impact on main CLI startup
 */

import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  port?: number;
  host?: string;
  noOpen?: boolean;
  installDir: string;
}

/** Check if a port is available by attempting to create a server */
function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => { resolve(false); server.close(); });
    server.once('listening', () => { resolve(true); server.close(); });
    server.listen(port, host);
  });
}

/** Find first available port in range [start, end] inclusive */
async function findAvailablePort(start: number, end: number, host: string): Promise<number> {
  for (let port = start; port <= end; port++) {
    if (await isPortAvailable(port, host)) return port;
  }
  throw new Error(`No available port in range ${start}-${end}`);
}

/** Open URL in default browser (cross-platform) */
function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start'
    : 'xdg-open';
  exec(`${cmd} "${url}"`, (err) => {
    if (err) {
      console.log(`  Could not open browser. Visit: ${url}`);
    }
  });
}

export async function startServer(options: ServerOptions): Promise<void> {
  const express = await import('express');
  const { createConfigRouter } = await import('./api/config-routes.js');

  const app = express.default();

  // Parse JSON bodies
  app.use(express.default.json());

  // CORS: localhost only
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    next();
  });

  // CRITICAL: Mount API routes BEFORE SPA catch-all
  app.use('/api', createConfigRouter(options.installDir));

  // Static serving for built SPA — relative to compiled server.js
  const uiDistPath = join(__dirname, 'ui-dist');
  if (existsSync(uiDistPath)) {
    app.use(express.default.static(uiDistPath));
  }

  // Health check / placeholder at root
  app.get('/', (_req, res) => {
    res.json({ name: 'epost-kit config dashboard', status: 'running' });
  });

  // Auto-select port from 3456-3460 range
  const host = options.host ?? 'localhost';
  const port = options.port ?? await findAvailablePort(3456, 3460, host);
  const url = `http://${host}:${port}`;

  const server = app.listen(port, host, () => {
    console.log(`\n  Config dashboard: ${url}\n`);
    if (!options.noOpen) {
      openBrowser(url);
    }
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n  Shutting down config dashboard...');
    server.close(() => process.exit(0));
    // Force exit after 3s if server doesn't close cleanly
    setTimeout(() => process.exit(0), 3000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
