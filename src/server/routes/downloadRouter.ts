import { Router, type Request, type Response } from 'express';
import type { DownloadRequest, DownloadResponse, DownloadStatusResponse } from '../../shared/types.js';
import { getAllJobs, startDownloadJob } from '../services/downloaderService.js';

export const downloadRouter = Router();

/**
 * POST /api/download
 * Triggers a new background download.
 */
downloadRouter.post('/', (req: Request, res: Response) => {
  const body = req.body as Partial<DownloadRequest>;

  if (!body.query || typeof body.query !== 'string' || body.query.trim() === '') {
    const errorRes: DownloadResponse = {
      success: false,
      error: 'Se requiere una URL o un término de búsqueda válido.',
    };
    return res.status(400).json(errorRes);
  }

  const job = startDownloadJob({
    query: body.query,
    playlist: body.playlist,
    format: body.format,
  });

  const response: DownloadResponse = {
    success: true,
    jobId: job.id,
    message: `Descarga iniciada en segundo plano para la playlist "${job.playlist}"`,
  };

  return res.status(202).json(response);
});

/**
 * GET /api/download/status
 * Returns list of active/recent background download jobs.
 */
downloadRouter.get('/status', (_req: Request, res: Response) => {
  const jobs = getAllJobs();
  const response: DownloadStatusResponse = {
    success: true,
    jobs,
  };
  return res.json(response);
});

export default downloadRouter;
