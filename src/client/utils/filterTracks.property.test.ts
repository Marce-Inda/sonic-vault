// Feature: local-music-player, Property 12: Search filter correctness

/**
 * Property-based tests for the `filterTracks` search utility.
 *
 * Property 12: Search filter correctness
 * For any list of tracks and any search query string, `filterTracks` SHALL
 * return only tracks whose title or artist contains the query substring
 * (case-insensitive comparison), and SHALL return all tracks when the query is
 * an empty string. The queue set from search results SHALL equal the filtered
 * output in its original order.
 *
 * Validates: Requirements 7.2, 7.4, 7.6
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { filterTracks } from './filterTracks';
import type { Track } from '@shared/types';

const NUM_RUNS = 200;

/**
 * Builds a Track from generated title/artist values, filling the remaining
 * fields with deterministic placeholders (they do not affect filtering).
 */
function makeTrack(title: string, artist: string, index: number): Track {
  return {
    id: `track-${index}`,
    fileName: `track-${index}.mp3`,
    title,
    artist,
    album: '',
    durationSeconds: 1,
    playlist: 'Test',
    streamUrl: `/api/stream/Test/track-${index}.mp3`,
  };
}

/** Arbitrary that produces an array of tracks with unique ids. */
const tracksArb: fc.Arbitrary<Track[]> = fc
  .array(fc.record({ title: fc.string(), artist: fc.string() }), {
    maxLength: 30,
  })
  .map((records) =>
    records.map((r, i) => makeTrack(r.title, r.artist, i)),
  );

/** Case-insensitive substring check mirroring the implementation. */
function matches(track: Track, normalizedQuery: string): boolean {
  return (
    track.title.toLowerCase().includes(normalizedQuery) ||
    track.artist.toLowerCase().includes(normalizedQuery)
  );
}

describe('filterTracks — Property 12: Search filter correctness', () => {
  it('returns only tracks whose title or artist contains the query (case-insensitive)', () => {
    fc.assert(
      fc.property(tracksArb, fc.string(), (tracks, query) => {
        const result = filterTracks(tracks, query);
        const normalizedQuery = query.trim().toLowerCase();

        if (normalizedQuery === '') {
          // Empty (or whitespace-only) query returns all tracks unchanged.
          expect(result).toEqual(tracks);
          return;
        }

        // Every returned track matches the query.
        for (const track of result) {
          expect(matches(track, normalizedQuery)).toBe(true);
        }

        // No matching track is omitted, and no non-matching track is included.
        const expected = tracks.filter((t) => matches(t, normalizedQuery));
        expect(result).toEqual(expected);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('returns all tracks (unchanged, same reference order) for an empty query', () => {
    fc.assert(
      fc.property(tracksArb, (tracks) => {
        const result = filterTracks(tracks, '');
        expect(result).toEqual(tracks);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('preserves the original order of tracks in the filtered output', () => {
    fc.assert(
      fc.property(tracksArb, fc.string(), (tracks, query) => {
        const result = filterTracks(tracks, query);

        // The result is a subsequence of the input: filtering preserves order.
        let inputIndex = 0;
        for (const track of result) {
          while (
            inputIndex < tracks.length &&
            tracks[inputIndex].id !== track.id
          ) {
            inputIndex += 1;
          }
          expect(inputIndex).toBeLessThan(tracks.length);
          inputIndex += 1;
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('finds tracks when queried with a real substring of an existing title or artist', () => {
    // Generate tracks where at least one has a non-empty title/artist, then
    // derive a query from a substring of an existing field to guarantee a hit.
    const nonEmptyTracksArb = fc
      .array(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 20 }),
          artist: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        { minLength: 1, maxLength: 15 },
      )
      .map((records) => records.map((r, i) => makeTrack(r.title, r.artist, i)));

    fc.assert(
      fc.property(
        nonEmptyTracksArb,
        fc.nat(),
        fc.nat(),
        fc.nat(),
        (tracks, trackSel, useArtistSel, sliceSel) => {
          const target = tracks[trackSel % tracks.length];
          const source =
            useArtistSel % 2 === 0 ? target.title : target.artist;

          // Build a non-empty substring of the source field.
          const start = sliceSel % source.length;
          const substring = source.slice(start, start + 1);

          // Skip whitespace-only substrings (they normalize to empty query).
          fc.pre(substring.trim().length > 0);

          const query = substring;
          const result = filterTracks(tracks, query);
          const normalizedQuery = query.trim().toLowerCase();

          // The target must be included since it contains the substring.
          expect(result.some((t) => t.id === target.id)).toBe(true);
          // And the result must equal the reference filter.
          const expected = tracks.filter((t) => matches(t, normalizedQuery));
          expect(result).toEqual(expected);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
