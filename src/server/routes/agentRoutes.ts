import { Router, type Request, type Response } from 'express';
import { sonicVaultOrchestrator } from '../agents/orchestrator.js';
import { audioHygieneAgent } from '../agents/audioHygieneAgent.js';
import { getPlaylists } from './playlists.js';

export const agentRouter = Router();

/**
 * POST /api/agent/chat
 * Main entry point for natural language interaction with the Multi-Agent System.
 */
agentRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, currentTrackId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'El campo message es requerido.' });
    }

    const playlistsRes = await getPlaylists();
    const playlists = playlistsRes.success ? playlistsRes.data : [];

    const response = await sonicVaultOrchestrator.handleUserChat(
      message,
      playlists,
      currentTrackId
    );

    return res.json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message || 'Error en el servidor multiagente.',
    });
  }
});

/**
 * GET /api/agent/lyrics
 * Fetches enriched lyrics (with Romaja phonetics & Spanish/English translations) for a track.
 */
agentRouter.get('/lyrics', async (req: Request, res: Response) => {
  try {
    const trackId = (req.query.trackId as string) || 'default-id';
    const title = (req.query.title as string) || 'Alone';
    const artist = (req.query.artist as string) || 'Jimin (BTS)';
    const filePath = (req.query.filePath as string) || '';

    const lyrics = await audioHygieneAgent.getLyricsForTrack(filePath, trackId, title, artist);
    return res.json({ success: true, data: lyrics });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message || 'Error al obtener letras.',
    });
  }
});

/**
 * POST /api/agent/clean-track
 * Cleans track titles and returns normalized metadata.
 */
agentRouter.post('/clean-track', (req: Request, res: Response) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ success: false, error: 'Filename es requerido.' });
  }
  const result = audioHygieneAgent.cleanMetadata(filename);
  return res.json({ success: true, data: result });
});

export default agentRouter;
