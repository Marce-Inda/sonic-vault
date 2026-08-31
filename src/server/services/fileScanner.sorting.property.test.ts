/**
 * Property-based test for the FileScanner service — playlist sorting.
 *
 * This test exercises `scanMusicFolder` against real temporary directories
 * (no mocks). Random subfolder names are generated, materialized as actual
 * directories, scanned, and the resulting `playlists` array is asserted to be
 * sorted case-insensitively.
 */

// Feature: local-music-player, Property 1: Playlist alphabetical sorting

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { scanMusicFolder } from './fileScanner';

/**
 * Generates a single valid directory name.
 *
 * Directory names must be non-empty, must not contain path separators or NUL,
 * and must not be the special entries "." or "..". We also trim to avoid
 * trailing dots/spaces that some filesystems normalize away, which would break
 * the 1:1 mapping between generated names and created folders. The alphabet
 * includes mixed casing so the case-insensitive comparison is exercised.
 */
const dirNameArb = fc
  .stringMatching(/^[a-zA-Z0-9 _-]{1,12}$/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && s !== '.' && s !== '..');

/**
 * Generates a set of unique directory names (case-insensitively unique so we
 * never attempt to create two folders that collide on case-insensitive
 * filesystems).
 */
const uniqueDirNamesArb = fc.uniqueArray(dirNameArb, {
  minLength: 0,
  maxLength: 15,
  selector: (s) => s.toLowerCase(),
});

/** Case-insensitive, locale-insensitive comparator matching the scanner's own. */
function compareCaseInsensitive(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase(), undefined, {
    sensitivity: 'base',
  });
}

/** Returns true when `names` is sorted according to `compareCaseInsensitive`. */
function isSortedCaseInsensitive(names: string[]): boolean {
  for (let i = 1; i < names.length; i++) {
    if (compareCaseInsensitive(names[i - 1], names[i]) > 0) {
      return false;
    }
  }
  return true;
}

describe('scanMusicFolder — Property 1: Playlist alphabetical sorting', () => {
  it(
    'returns playlists sorted alphabetically (case-insensitive) for any set of subfolder names',
    async () => {
      await fc.assert(
        fc.asyncProperty(uniqueDirNamesArb, async (names) => {
          const tmpRoot = await fs.mkdtemp(
            path.join(os.tmpdir(), 'spotimp4-prop1-')
          );
          try {
            // Materialize each generated name as a real subfolder.
            for (const name of names) {
              await fs.mkdir(path.join(tmpRoot, name));
            }

            const result = await scanMusicFolder(tmpRoot);

            const resultNames = result.playlists.map((p) => p.name);

            // The scanner must surface exactly the created playlists...
            expect([...resultNames].sort()).toEqual([...names].sort());
            // ...and the returned order must be alphabetical, case-insensitive.
            expect(isSortedCaseInsensitive(resultNames)).toBe(true);
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
 * **Validates: Requirements 1.1**
 */
