import { Router, type Request, type Response } from 'express';
import type { PlaylistActionResponse } from '../../shared/types.js';
import {
  addTrackToPlaylist,
  createVirtualPlaylist,
  deleteVirtualPlaylist,
  removeTrackFromPlaylist,
} from '../services/virtualPlaylistStore.js';

export const virtualPlaylistsRouter = Router();

/**
 * POST /api/virtual-playlists
 * Create a new virtual playlist.
 */
virtualPlaylistsRouter.post('/', (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== 'string' || name.trim() === '') {
    const errorRes: PlaylistActionResponse = {
      success: false,
      error: 'Se requiere un nombre de playlist válido.',
    };
    return res.status(400).json(errorRes);
  }

  const created = createVirtualPlaylist(name.trim());
  const response: PlaylistActionResponse = {
    success: true,
    message: `Playlist "${created.name}" creada exitosamente.`,
  };
  return res.status(201).json(response);
});

/**
 * DELETE /api/virtual-playlists/:name
 * Delete a virtual playlist.
 */
virtualPlaylistsRouter.delete('/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const deleted = deleteVirtualPlaylist(decodeURIComponent(name));

  if (!deleted) {
    const errorRes: PlaylistActionResponse = {
      success: false,
      error: 'No se encontró la playlist.',
    };
    return res.status(404).json(errorRes);
  }

  const response: PlaylistActionResponse = {
    success: true,
    message: 'Playlist eliminada exitosamente.',
  };
  return res.json(response);
});

/**
 * POST /api/virtual-playlists/:name/tracks
 * Add a track to a virtual playlist.
 */
virtualPlaylistsRouter.post('/:name/tracks', (req: Request, res: Response) => {
  const { name } = req.params;
  const { trackId } = req.body as { trackId?: string };

  if (!trackId || typeof trackId !== 'string') {
    const errorRes: PlaylistActionResponse = {
      success: false,
      error: 'Se requiere un ID de pista válido.',
    };
    return res.status(400).json(errorRes);
  }

  const added = addTrackToPlaylist(decodeURIComponent(name), trackId);

  if (!added) {
    const errorRes: PlaylistActionResponse = {
      success: false,
      error: 'No se pudo agregar la canción a la playlist.',
    };
    return res.status(400).json(errorRes);
  }

  const response: PlaylistActionResponse = {
    success: true,
    message: 'Canción agregada a la playlist.',
  };
  return res.json(response);
});

/**
 * DELETE /api/virtual-playlists/:name/tracks/:trackId
 * Remove a track from a virtual playlist.
 */
virtualPlaylistsRouter.delete('/:name/tracks/:trackId', (req: Request, res: Response) => {
  const { name, trackId } = req.params;

  const removed = removeTrackFromPlaylist(
    decodeURIComponent(name),
    decodeURIComponent(trackId),
  );

  if (!removed) {
    const errorRes: PlaylistActionResponse = {
      success: false,
      error: 'No se pudo remover la canción de la playlist.',
    };
    return res.status(400).json(errorRes);
  }

  const response: PlaylistActionResponse = {
    success: true,
    message: 'Canción removida de la playlist.',
  };
  return res.json(response);
});

export default virtualPlaylistsRouter;
