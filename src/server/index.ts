try {
  process.loadEnvFile?.();
} catch {
  // .env file is optional
}

import { createApp } from './app.js';

/**
 * Express app entry point for SonicVault.
 *
 * Boots the configured Express application, binds it to the configured port,
 * and installs graceful-shutdown handlers so the process exits cleanly.
 */

const PORT = Number(process.env.PORT) || 3001;

const app = createApp();

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SonicVault server running on http://localhost:${PORT}`);
});

// Graceful shutdown: close the HTTP server on termination signals.
const shutdown = (signal: string): void => {
  // eslint-disable-next-line no-console
  console.log(`\n[SonicVault] Received ${signal}, shutting down...`);
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('[SonicVault] Server closed.');
    process.exit(0);
  });
};


process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
