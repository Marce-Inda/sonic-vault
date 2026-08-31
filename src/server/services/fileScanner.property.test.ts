/**
 * Property-based tests for the FileScanner service (`scanMusicFolder`).
 *
 * These tests use fast-check against real temporary directories (no mocks) to
 * validate the universal correctness properties defined in the design document.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { scanMusicFolder } from './fileScanner';

/** Creates an empty file at the given path (parent directories must exist). */
async function touch(filePath: string): Promise<void> {
  await fs.writeFile(filePath, '');
}

/** Extensions considered valid audio files by the scanner. */
const AUDIO_EXTENSIONS = ['mp3', 'mp4'];
/** Non-audio extensions used to verify they are filtered out. */
const NON_AUDIO_EXTENSIONS = ['txt', 'jpg', 'flac', 'wav', 'png', 'json', 'mp5', 'p3', ''];

/**
 * A generated filesystem entry that will be materialized inside a playlist
 * folder: either a file (with some extension) or a nested subdirectory that
 * itself contains audio files.
 */
interface GeneratedEntry {
  /** Base name (without extension) — unique within its parent. */
  baseName: string;
  /** Extension without the dot. Empty string means no extension. */
  extension: string;
  /** Whether this entry is a nested subdirectory. */
  isDirectory: boolean;
}

// Feature: local-music-player, Property 2: File extension filtering
describe('scanMusicFolder — Property 2: File extension filtering', () => {
  it(
    'returns only top-level .mp3/.mp4 files, excluding other extensions and nested subdir contents',
    async () => {
      // Generator for a single filesystem entry inside a playlist folder.
      const entryArb: fc.Arbitrary<GeneratedEntry> = fc.record({
        baseName: fc
          // Restrict to filesystem-safe names (no separators, dots, or spaces
          // that could confuse extension parsing) and ensure non-empty.
          .stringMatching(/^[a-zA-Z0-9_-]{1,12}$/),
        extension: fc.constantFrom(...AUDIO_EXTENSIONS, ...NON_AUDIO_EXTENSIONS),
        isDirectory: fc.boolean(),
      });

      await fc.assert(
        fc.asyncProperty(fc.array(entryArb, { maxLength: 15 }), async (entries) => {
          const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spotimp4-prop2-'));
          try {
            const playlistDir = path.join(tmpRoot, 'Playlist');
            await fs.mkdir(playlistDir);

            // De-duplicate by the resulting entry name so we don't attempt to
            // create the same path twice (files vs dirs collisions, etc.).
            const usedNames = new Set<string>();
            // Track which top-level file names should be indexed by the scanner.
            const expectedFileNames = new Set<string>();

            for (const entry of entries) {
              const fileName =
                entry.extension === '' ? entry.baseName : `${entry.baseName}.${entry.extension}`;

              if (usedNames.has(fileName)) continue;
              usedNames.add(fileName);

              if (entry.isDirectory) {
                // Nested subdirectory containing audio files that MUST be
                // excluded from the scan results.
                const nestedDir = path.join(playlistDir, fileName);
                await fs.mkdir(nestedDir);
                await touch(path.join(nestedDir, 'nested-song.mp3'));
                await touch(path.join(nestedDir, 'nested-video.mp4'));
              } else {
                await touch(path.join(playlistDir, fileName));
                const ext = entry.extension.toLowerCase();
                if (AUDIO_EXTENSIONS.includes(ext)) {
                  expectedFileNames.add(fileName);
                }
              }
            }

            const result = await scanMusicFolder(tmpRoot);

            // Exactly one playlist should be discovered.
            expect(result.playlists).toHaveLength(1);
            const returnedNames = result.playlists[0].tracks.map((t) => t.fileName);

            // The set of returned files equals exactly the top-level audio files.
            expect(new Set(returnedNames)).toEqual(expectedFileNames);

            // Every returned file has a supported extension and none originate
            // from nested subdirectories.
            for (const track of result.playlists[0].tracks) {
              const ext = path.extname(track.fileName).slice(1).toLowerCase();
              expect(AUDIO_EXTENSIONS).toContain(ext);
              expect(track.extension).toBe(ext);
              // File path is directly inside the playlist folder, not nested.
              expect(path.dirname(track.filePath)).toBe(playlistDir);
            }
          } finally {
            await fs.rm(tmpRoot, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 }
      );
    },
    // Generous timeout: property runs 100 iterations that each hit real disk.
    60_000
  );
});

/**
 * **Validates: Requirements 1.2**
 */
