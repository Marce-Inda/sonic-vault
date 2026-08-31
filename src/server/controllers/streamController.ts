/**
 * StreamController.
 *
 * Serves audio files (`.mp3`/`.mp4`) that live inside the "musica" folder as
 * HTTP streams, with support for HTTP Range Requests so the client can seek
 * within a track.
 *
 * Behavior (see Requirements 2.1 and 3.6):
 * - Resolves the requested file from `musica/<playlist>/<track>` relative to
 *   the project root.
 * - Sends the correct MIME type: `audio/mpeg` for `.mp3`, `audio/mp4` for
 *   `.mp4`.
 * - Honors a `Range` header by responding with `206 Partial Content`,
 *   `Content-Range` and `Accept-Ranges: bytes`; otherwise streams the whole
 *   file with `200 OK`.
 * - Returns `404` when the requested file does not exist.
 * - Guards against path traversal in the `playlist`/`track` route params so a
 *   request can never escape the "musica" folder.
 */

import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Absolute path to the "musica" folder.
 *
 * Resolved relative to the process working directory (the project root) so it
 * is consistent across dev (tsx), the compiled production build (npm start),
 * and the test runner — none of which share the same `__dirname` depth. Can be
 * overridden with the MUSIC_DIR environment variable.
 */
export const MUSIC_ROOT = process.env.MUSIC_DIR
  ? path.resolve(process.env.MUSIC_DIR)
  : path.resolve(process.cwd(), 'musica');

/** Maps a supported audio extension to its MIME type. */
const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.mp4': 'audio/mp4',
};

/**
 * Resolves a safe absolute path inside the "musica" folder for the given
 * playlist and track, or `null` when the request would escape the music root
 * (path traversal) or targets an unsupported file type.
 */
function resolveSafeTrackPath(playlist: string, track: string): string | null {
  // Decode URL-encoded segments (e.g. spaces, accents) before resolving.
  let decodedPlaylist: string;
  let decodedTrack: string;
  try {
    decodedPlaylist = decodeURIComponent(playlist);
    decodedTrack = decodeURIComponent(track);
  } catch {
    // Malformed percent-encoding.
    return null;
  }

  // Reject any segment that contains a path separator or traversal marker.
  // The route params must each be a single path component.
  for (const segment of [decodedPlaylist, decodedTrack]) {
    if (
      segment.length === 0 ||
      segment.includes('/') ||
      segment.includes('\\') ||
      segment.includes('\0') ||
      segment === '.' ||
      segment === '..'
    ) {
      return null;
    }
  }

  const candidate = path.resolve(MUSIC_ROOT, decodedPlaylist, decodedTrack);

  // Ensure the resolved path is still inside the music root.
  const relative = path.relative(MUSIC_ROOT, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  // Only serve supported audio extensions.
  const ext = path.extname(candidate).toLowerCase();
  if (!(ext in MIME_TYPES)) {
    return null;
  }

  return candidate;
}

/**
 * Parses a `Range` header of the form `bytes=start-end` against a known file
 * size. Returns the resolved `[start, end]` byte offsets (inclusive), or
 * `null` when the header is absent/unsupported, or `'unsatisfiable'` when the
 * range falls outside the file.
 */
function parseRange(
  rangeHeader: string | undefined,
  fileSize: number
): { start: number; end: number } | null | 'unsatisfiable' {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    // Unsupported range unit or malformed header: fall back to full response.
    return null;
  }

  const [, startRaw, endRaw] = match;

  // At least one of start/end must be present.
  if (startRaw === '' && endRaw === '') {
    return null;
  }

  let start: number;
  let end: number;

  if (startRaw === '') {
    // Suffix range: last N bytes ("bytes=-500").
    const suffixLength = Number(endRaw);
    if (suffixLength === 0) {
      return 'unsatisfiable';
    }
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number(startRaw);
    end = endRaw === '' ? fileSize - 1 : Number(endRaw);
  }

  // Clamp the end to the last byte.
  if (end > fileSize - 1) {
    end = fileSize - 1;
  }

  if (start > end || start < 0 || start >= fileSize) {
    return 'unsatisfiable';
  }

  return { start, end };
}

/**
 * Express handler for `GET /api/stream/:playlist/:track`.
 *
 * Streams the requested audio file, supporting HTTP Range Requests for seeking
 * and returning `404` when the file cannot be found.
 */
export function streamTrack(req: Request, res: Response): void {
  const { playlist, track } = req.params;

  const filePath = resolveSafeTrackPath(playlist, track);
  if (filePath === null) {
    res.status(404).json({ success: false, error: 'Pista no encontrada' });
    return;
  }

  void serveFile(filePath, req, res);
}

/**
 * Performs the asynchronous file stat + streaming for a resolved, safe path.
 */
async function serveFile(filePath: string, req: Request, res: Response): Promise<void> {
  let stats;
  try {
    stats = await fs.stat(filePath);
  } catch {
    res.status(404).json({ success: false, error: 'Pista no encontrada' });
    return;
  }

  if (!stats.isFile()) {
    res.status(404).json({ success: false, error: 'Pista no encontrada' });
    return;
  }

  const fileSize = stats.size;
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

  // Range requests enable seeking within the audio file.
  const range = parseRange(req.headers.range, fileSize);

  if (range === 'unsatisfiable') {
    res.status(416).set({
      'Content-Range': `bytes */${fileSize}`,
      'Accept-Ranges': 'bytes',
    });
    res.end();
    return;
  }

  if (range) {
    const { start, end } = range;
    const chunkSize = end - start + 1;

    res.status(206).set({
      'Content-Type': contentType,
      'Content-Length': String(chunkSize),
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
    });

    const stream = createReadStream(filePath, { start, end });
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Error al leer la pista' });
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
    return;
  }

  // Full-content response.
  res.status(200).set({
    'Content-Type': contentType,
    'Content-Length': String(fileSize),
    'Accept-Ranges': 'bytes',
  });

  const stream = createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Error al leer la pista' });
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

export default streamTrack;
