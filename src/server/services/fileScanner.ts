/**
 * FileScanner service.
 *
 * Scans the "musica" folder and returns its structure as playlists. Each
 * first-level subfolder of the base path is treated as a playlist, and only
 * `.mp3` and `.mp4` files found directly inside those subfolders are indexed.
 *
 * Behavior (see Requirements 1.1–1.6):
 * - First-level subfolders become playlists, sorted alphabetically
 *   (case-insensitive).
 * - Only `.mp3`/`.mp4` files at the first level of each subfolder are indexed;
 *   nested subdirectories and non-audio files are ignored.
 * - A subfolder with no audio files is still returned (with an empty track list).
 * - Audio files placed directly in the base "musica" folder (not inside a
 *   subfolder) are ignored.
 * - A missing or inaccessible base folder produces a `ScanError` and an empty
 *   playlist list.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { ScanResult, PlaylistInfo, TrackFile, ScanError } from '../../shared/types.js';

/** Audio extensions supported by the scanner. */
const SUPPORTED_EXTENSIONS = ['mp3', 'mp4'] as const;

type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

/**
 * Returns the supported audio extension for a file name, or `null` when the
 * file is not a supported audio file. The comparison is case-insensitive.
 */
function getSupportedExtension(fileName: string): SupportedExtension | null {
  // path.extname returns e.g. ".MP3"; strip the dot and normalize case.
  const ext = path.extname(fileName).slice(1).toLowerCase();
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as SupportedExtension)
    : null;
}

/**
 * Compares two playlist names alphabetically, case-insensitively, so that the
 * resulting ordering is stable and locale-insensitive.
 */
function compareNamesCaseInsensitive(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase(), undefined, {
    sensitivity: 'base',
  });
}

/**
 * Maps a Node.js filesystem error to a `ScanError` describing the failure.
 */
function toScanError(error: unknown): ScanError {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;

  if (code === 'EACCES' || code === 'EPERM') {
    return {
      type: 'permission_denied',
      message: "No se tienen permisos para acceder a la carpeta 'musica'",
    };
  }

  // ENOENT and anything else we cannot recover from is treated as "not found".
  return {
    type: 'folder_not_found',
    message: "Carpeta 'musica' no encontrada",
  };
}

/**
 * Scans a single playlist subfolder and returns the audio files found directly
 * within it (nested subdirectories are ignored).
 */
async function scanPlaylistFolder(
  playlistName: string,
  playlistPath: string
): Promise<PlaylistInfo> {
  const entries = await fs.readdir(playlistPath, { withFileTypes: true });

  const tracks: TrackFile[] = [];

  for (const entry of entries) {
    // Ignore nested subdirectories (and anything that is not a regular file).
    if (!entry.isFile()) {
      continue;
    }

    const extension = getSupportedExtension(entry.name);
    if (extension === null) {
      continue;
    }

    tracks.push({
      fileName: entry.name,
      filePath: path.join(playlistPath, entry.name),
      extension,
    });
  }

  // Keep tracks in a stable alphabetical order within the playlist.
  tracks.sort((a, b) => compareNamesCaseInsensitive(a.fileName, b.fileName));

  return {
    name: playlistName,
    path: playlistPath,
    tracks,
  };
}

/**
 * Scans the "musica" folder at `basePath` and returns the discovered
 * playlists together with any errors encountered.
 *
 * @param basePath Path to the "musica" folder.
 */
export async function scanMusicFolder(basePath: string): Promise<ScanResult> {
  let rootEntries;
  try {
    rootEntries = await fs.readdir(basePath, { withFileTypes: true });
  } catch (error) {
    // Missing or inaccessible base folder: no playlists, one descriptive error.
    return {
      playlists: [],
      errors: [toScanError(error)],
    };
  }

  // First-level subfolders become playlists. Files directly in the base folder
  // (including audio files) are ignored.
  const subfolders = rootEntries.filter((entry) => entry.isDirectory());

  const errors: ScanError[] = [];

  const playlists = await Promise.all(
    subfolders.map(async (folder) => {
      const playlistPath = path.join(basePath, folder.name);
      try {
        return await scanPlaylistFolder(folder.name, playlistPath);
      } catch (error) {
        // A single unreadable subfolder should not abort the whole scan; record
        // the error and treat the playlist as empty.
        errors.push(toScanError(error));
        return {
          name: folder.name,
          path: playlistPath,
          tracks: [],
        } satisfies PlaylistInfo;
      }
    })
  );

  // Playlists are returned in alphabetical (case-insensitive) order.
  playlists.sort((a, b) => compareNamesCaseInsensitive(a.name, b.name));

  return {
    playlists,
    errors,
  };
}


