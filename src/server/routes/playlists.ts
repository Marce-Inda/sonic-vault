/**
 * API route: `GET /api/playlists`.
 *
 * Combines the {@link scanMusicFolder} file scanner with the
 * {@link parseTrackMetadata} metadata parser to build the full playlist data
 * consumed by the frontend.
 *
 * Behavior (see Requirements 1.1–1.4, 6.1, 6.2):
 * - Scans the "musica" folder (resolved relative to the project root).
 * - For each first-level subfolder (playlist), builds a {@link Playlist} whose
 *   tracks are fully-populated {@link Track} objects (metadata + stream URL).
 * - Playlists are returned in the alphabetical order produced by the scanner;
 *   playlists with no audio files are still returned with an empty track list
 *   (`trackCount === 0`).
 * - When the "musica" folder is missing or inaccessible, responds with
 *   `{ success: false, data: [], error }` describing the failure.
 */

import { Router, type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Playlist, PlaylistsResponse, Track } from '../../shared/types.js';
import { scanMusicFolder } from '../services/fileScanner.js';
import { parseTrackMetadata } from '../services/metadataParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import os from 'node:os';
import fs from 'node:fs';

/**
 * Absolute path to the "musica" folder.
 *
 * Resolves to MUSIC_DIR env var if present, otherwise checks for the system's
 * user Music directory (`~/Música` or `~/Music`), falling back to `./musica`.
 */
export function resolveMusicFolderPath(): string {
  if (process.env.MUSIC_DIR) {
    return path.resolve(process.env.MUSIC_DIR);
  }
  const homeMusicEs = path.join(os.homedir(), 'Música');
  if (fs.existsSync(homeMusicEs)) {
    return homeMusicEs;
  }
  const homeMusicEn = path.join(os.homedir(), 'Music');
  if (fs.existsSync(homeMusicEn)) {
    return homeMusicEn;
  }
  return path.resolve(process.cwd(), 'musica');
}

export const MUSIC_FOLDER_PATH = resolveMusicFolderPath();


/**
 * Build the URL used to stream a track: `/api/stream/{playlist}/{fileName}`.
 *
 * Both path segments are URL-encoded so playlist and file names containing
 * spaces or reserved characters produce a valid, unambiguous URL.
 */
export function buildStreamUrl(playlist: string, fileName: string): string {
  return `/api/stream/${encodeURIComponent(playlist)}/${encodeURIComponent(fileName)}`;
}

/**
 * Build a stable, unique identifier for a track from its playlist and file name.
 */
export function buildTrackId(playlist: string, fileName: string): string {
  return `${playlist}/${fileName}`;
}

/**
 * Scan the "musica" folder and assemble the full {@link PlaylistsResponse}.
 *
 * The `basePath` and scanner/parser functions are injectable so this can be
 * exercised in tests without touching a real "musica" folder.
 *
 * @param basePath - Path to the "musica" folder. Defaults to {@link MUSIC_FOLDER_PATH}.
 * @param deps - Optional overrides for the scanner and metadata parser.
 */
import { getVirtualPlaylists } from '../services/virtualPlaylistStore.js';

export async function getPlaylists(
  basePath: string = resolveMusicFolderPath(),
  deps: {
    scan?: typeof scanMusicFolder;
    parseMetadata?: typeof parseTrackMetadata;
  } = {},
): Promise<PlaylistsResponse> {
  const scan = deps.scan ?? scanMusicFolder;
  const parseMetadata = deps.parseMetadata ?? parseTrackMetadata;

  const result = await scan(basePath);

  if (result.playlists.length === 0 && result.errors.length > 0) {
    return {
      success: false,
      data: [],
      error: result.errors[0].message,
    };
  }

  const folderPlaylists: Playlist[] = await Promise.all(
    result.playlists.map(async (playlistInfo): Promise<Playlist> => {
      const tracks: Track[] = await Promise.all(
        playlistInfo.tracks.map(async (trackFile): Promise<Track> => {
          const metadata = await parseMetadata(trackFile.filePath);
          return {
            id: buildTrackId(playlistInfo.name, trackFile.fileName),
            fileName: trackFile.fileName,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            durationSeconds: metadata.durationSeconds,
            playlist: playlistInfo.name,
            streamUrl: buildStreamUrl(playlistInfo.name, trackFile.fileName),
            isVideo: trackFile.extension === 'mp4' || trackFile.fileName.toLowerCase().endsWith('.mp4'),
          };
        }),
      );

      return {
        name: playlistInfo.name,
        trackCount: tracks.length,
        tracks,
      };
    }),
  );

  // Master Pool of all tracks
  const allTracks: Track[] = [];
  const trackMap = new Map<string, Track>();

  for (const pl of folderPlaylists) {
    for (const tr of pl.tracks) {
      if (!trackMap.has(tr.id)) {
        trackMap.set(tr.id, tr);
        allTracks.push(tr);
      }
    }
  }

  const masterPlaylist: Playlist = {
    name: '🎵 Todas las canciones',
    trackCount: allTracks.length,
    tracks: allTracks,
  };

  // Virtual Playlists stored in JSON
  const virtualDefs = getVirtualPlaylists();
  const virtualPlaylists: Playlist[] = virtualDefs.map((def) => {
    const tracks: Track[] = [];
    for (const trackId of def.trackIds) {
      const found = trackMap.get(trackId);
      if (found) {
        tracks.push(found);
      }
    }
    return {
      name: def.name,
      trackCount: tracks.length,
      tracks,
    };
  });

  const data: Playlist[] = [masterPlaylist, ...virtualPlaylists, ...folderPlaylists];

  return { success: true, data };
}


/**
 * Express router exposing `GET /api/playlists`.
 */
export const playlistsRouter = Router();

playlistsRouter.get('/', async (_req: Request, res: Response) => {
  const response = await getPlaylists();
  // The scan itself never rejects (errors are captured in ScanResult), so a
  // failed scan is a valid 200 response carrying `success: false`.
  res.json(response);
});

export default playlistsRouter;
