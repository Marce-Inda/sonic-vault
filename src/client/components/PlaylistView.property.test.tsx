// Feature: local-music-player, Property 9: Queue alphabetical ordering

/**
 * Property-based tests for `sortTracksAlphabetically`, the function used to
 * build the playback queue when a user starts playback from a playlist.
 *
 * Property 9: Queue alphabetical ordering
 * For any list of tracks in a playlist, when the user starts playback from that
 * playlist, the queue SHALL be ordered alphabetically by track title (matching
 * the sort used for display).
 *
 * Validates: Requirements 4.3
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { sortTracksAlphabetically } from './PlaylistView';
import type { Track } from '@shared/types';

const NUM_RUNS = 200;

/**
 * Builds a Track from a generated title, filling the remaining fields with
 * deterministic placeholders (they do not affect alphabetical ordering).
 */
function makeTrack(title: string, index: number): Track {
  return {
    id: `track-${index}`,
    fileName: `track-${index}.mp3`,
    title,
    artist: 'Artista desconocido',
    album: '',
    durationSeconds: 1,
    playlist: 'Test',
    streamUrl: `/api/stream/Test/track-${index}.mp3`,
  };
}

/** Arbitrary that produces an array of tracks with unique ids and random titles. */
const tracksArb: fc.Arbitrary<Track[]> = fc
  .array(fc.string(), { maxLength: 40 })
  .map((titles) => titles.map((title, i) => makeTrack(title, i)));

/** Returns a sorted multiset of ids for permutation comparison. */
function idMultiset(tracks: Track[]): string[] {
  return tracks.map((t) => t.id).sort();
}

describe('sortTracksAlphabetically — Property 9: Queue alphabetical ordering', () => {
  it('returns a permutation of the input (no tracks added, dropped, or duplicated)', () => {
    fc.assert(
      fc.property(tracksArb, (tracks) => {
        const result = sortTracksAlphabetically(tracks);

        // Same number of tracks.
        expect(result.length).toBe(tracks.length);
        // Exactly the same set of ids (as a multiset), so it is a permutation.
        expect(idMultiset(result)).toEqual(idMultiset(tracks));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('produces output sorted case-insensitively by title', () => {
    fc.assert(
      fc.property(tracksArb, (tracks) => {
        const result = sortTracksAlphabetically(tracks);

        // Each adjacent pair must be in non-descending case-insensitive order.
        for (let i = 1; i < result.length; i += 1) {
          const prev = result[i - 1].title;
          const curr = result[i].title;
          const cmp = prev.localeCompare(curr, undefined, {
            sensitivity: 'base',
          });
          expect(cmp).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('does not mutate the input array', () => {
    fc.assert(
      fc.property(tracksArb, (tracks) => {
        const snapshot = tracks.map((t) => t.id);
        sortTracksAlphabetically(tracks);
        // Original order/content is preserved.
        expect(tracks.map((t) => t.id)).toEqual(snapshot);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('is idempotent: sorting an already-sorted queue yields the same order', () => {
    fc.assert(
      fc.property(tracksArb, (tracks) => {
        const once = sortTracksAlphabetically(tracks);
        const twice = sortTracksAlphabetically(once);
        expect(twice.map((t) => t.id)).toEqual(once.map((t) => t.id));
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
