import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { streamTrack } from './controllers/streamController.js';
import { playlistsRouter } from './routes/playlists.js';
import { downloadRouter } from './routes/downloadRouter.js';
import { virtualPlaylistsRouter } from './routes/virtualPlaylistsRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



/**
 * Creates and configures the Express application.
 *
 * Responsibilities:
 * - Configure CORS so the Vite dev client (localhost:5173) can reach the API.
 * - Parse JSON request bodies.
 * - Expose the /api/health endpoint.
 * - Wire the API routers/controllers:
 *     - GET /api/playlists              (task 4.1 - src/server/routes/playlists.ts, mounted)
 *     - GET /api/stream/:playlist/:track (task 4.2 - src/server/controllers/streamController.ts)
 * - In production (NODE_ENV === 'production'), serve the built Vite client
 *   from dist/client and fall back to index.html for client-side routes.
 * - Provide consistent 404 and error handling for the API surface.
 *
 * @param clientDistPath - Optional override for the built client directory.
 *   Defaults to `dist/client` relative to this module (dist/server/app.js).
 */
export function createApp(clientDistPath?: string): Express {
  const app = express();

  // --- Middleware --------------------------------------------------------
  // Allow the frontend (dev server or same-origin in prod) to call the API.
  app.use(cors());
  app.use(express.json());

  // --- Health check ------------------------------------------------------
  // Kept intact for boot verification / smoke tests.
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // --- API routes --------------------------------------------------------
  // Routes are registered via registerApiRoutes so their concrete
  // implementations (tasks 4.1 and 4.2) can be plugged in without changing
  // the surrounding app configuration.
  registerApiRoutes(app);

  // Any unmatched /api/* route returns a JSON 404 rather than falling through
  // to the SPA fallback below.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
  });

  // --- Static assets (production only) -----------------------------------
  if (process.env.NODE_ENV === 'production') {
    // The Vite client build outputs to <root>/dist/client. Resolve it from the
    // process working directory (project root) so it is independent of the
    // compiled server's nesting depth.
    const clientDist = clientDistPath ?? path.resolve(process.cwd(), 'dist/client');
    app.use(express.static(clientDist));

    // SPA fallback: any non-API GET route returns the client index.html so
    // client-side routing works on refresh/deep links.
    app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // --- Centralized error handler -----------------------------------------
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    // eslint-disable-next-line no-console
    console.error('[SonicVault] Unhandled error:', message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: message });
    }
  });

  return app;
}

/**
 * Registers the API routers/controllers onto the app.
 *
 * The concrete implementations are delivered by later tasks:
 * - Task 4.1: `GET /api/playlists` (playlistsRouter)
 * - Task 4.2: `GET /api/stream/:playlist/:track` (streamTrack controller)
 *
 * They are wired here so this file remains the single place that composes the
 * API surface. Once the route modules exist, import and mount them below, e.g.:
 *
 * ```ts
 * import { playlistsRouter } from './routes/playlists.js';
 * import { streamTrack } from './controllers/streamController.js';
 *
 * ```
 */
function registerApiRoutes(app: Express): void {


  // Task 4.1: GET /api/playlists
  app.use('/api/playlists', playlistsRouter);

  // Virtual Playlists API
  app.use('/api/virtual-playlists', virtualPlaylistsRouter);

  // Background Downloader API
  app.use('/api/download', downloadRouter);

  // Task 4.2: stream audio files, with Range Request support for seeking.
  app.get('/api/stream/:playlist/:track', streamTrack);
}



export default createApp;
