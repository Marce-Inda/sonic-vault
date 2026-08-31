/**
 * MetadataParser service.
 *
 * Extracts audio metadata (title, artist, album, duration) from MP3 (ID3) and
 * MP4 files using the `music-metadata` library, applying sensible fallbacks so
 * that a valid {@link TrackMetadata} object is always produced.
 *
 * Fallback rules (see Requirement 6.2):
 * - Missing title  -> file name without its extension
 * - Missing artist -> "Artista desconocido"
 * - Missing album  -> "" (empty string)
 * - Duration is always a positive number (> 0). When metadata provides no
 *   usable duration we fall back to {@link FALLBACK_DURATION_SECONDS}.
 */

import { parseFile } from 'music-metadata';
import type { TrackMetadata } from '../../shared/types.js';

/** Default artist used when no artist metadata is present. */
export const UNKNOWN_ARTIST = 'Artista desconocido';

/**
 * Positive duration used as a last resort when neither the metadata tags nor
 * the audio stream expose a usable duration. It is intentionally a small
 * positive value so the invariant "duration > 0" always holds; the UI treats
 * it as a placeholder rather than a real length.
 */
export const FALLBACK_DURATION_SECONDS = 1;

/**
 * Minimal shape of the raw parsed metadata that the fallback logic consumes.
 * Mirrors the relevant fields of `music-metadata`'s `IAudioMetadata` but keeps
 * this helper decoupled from the library so it can be unit/property tested
 * without any file I/O.
 */
export interface RawParsedMetadata {
  common?: {
    title?: string | null;
    artist?: string | null;
    album?: string | null;
  };
  format?: {
    duration?: number | null;
  };
}

/**
 * Return the file name with its extension removed.
 *
 * Handles paths that include directory separators by taking the base name
 * first, and only strips the final extension segment.
 */
export function fileNameWithoutExtension(fileName: string): string {
  // Take the base name (drop any directory portion, supporting both separators).
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const dotIndex = base.lastIndexOf('.');
  // A leading dot (e.g. ".mp3") is treated as a hidden file with no extension.
  if (dotIndex <= 0) {
    return base;
  }
  return base.slice(0, dotIndex);
}

/**
 * Return a trimmed string when the value is a non-empty string, otherwise
 * `undefined`. Used to treat whitespace-only tags as "missing".
 */
function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Apply the metadata fallback rules to raw parsed metadata.
 *
 * This is a pure function (no I/O) so it can be exercised directly by the
 * property test for Property 10 (metadata fallback logic).
 *
 * @param raw - Raw parsed metadata (fields may be missing/null/empty).
 * @param fileName - The track's file name (used for the title fallback).
 * @returns A fully-populated {@link TrackMetadata} with all fallbacks applied.
 */
export function applyMetadataFallbacks(
  raw: RawParsedMetadata | null | undefined,
  fileName: string,
): TrackMetadata {
  const common = raw?.common ?? {};
  const format = raw?.format ?? {};

  const title = nonEmptyString(common.title) ?? fileNameWithoutExtension(fileName);
  const artist = nonEmptyString(common.artist) ?? UNKNOWN_ARTIST;
  const album = nonEmptyString(common.album) ?? '';

  const rawDuration = format.duration;
  const durationSeconds =
    typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration > 0
      ? rawDuration
      : FALLBACK_DURATION_SECONDS;

  return { title, artist, album, durationSeconds };
}

/**
 * Parse the metadata of an audio track from disk.
 *
 * Reads ID3 tags (MP3) / MP4 metadata via `music-metadata`, then applies the
 * fallback rules. If parsing fails entirely (corrupt/unreadable file), the
 * fallbacks are still applied using only the file name so a valid
 * {@link TrackMetadata} is always returned.
 *
 * @param filePath - Absolute or relative path to the audio file.
 * @returns The extracted (and fallback-completed) track metadata.
 */
export async function parseTrackMetadata(filePath: string): Promise<TrackMetadata> {
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath;

  try {
    const metadata = await parseFile(filePath, { duration: true });
    return applyMetadataFallbacks(metadata, fileName);
  } catch {
    // Corrupt or unreadable file: still return valid metadata via fallbacks.
    return applyMetadataFallbacks(null, fileName);
  }
}
