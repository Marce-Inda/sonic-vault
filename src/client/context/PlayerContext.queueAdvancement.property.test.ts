// Feature: local-music-player, Property 4: Queue advancement
/**
 * Property-based test for queue advancement in the player reducer.
 *
 * Property 4: Queue advancement
 * For any queue of tracks and any valid current index, advancing to the next
 * track SHALL set the current index to `index + 1` if `index < queue.length - 1`,
 * and SHALL stop playback (isPlaying = false) if `index === queue.length - 1`.
 *
 * **Validates: Requirements 2.5, 2.6, 3.1, 3.2**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { playerReducer, initialPlayerState, type PlayerState } from './PlayerContext';
import type { Track } from '@shared/types';

/** Build a Track from a unique numeric id. */
function makeTrack(n: number): Track {
  const id = String(n);
  return {
    id,
    fileName: `${id}.mp3`,
    title: `Track ${id}`,
    artist: 'Artista',
    album: '',
    durationSeconds: 100,
    playlist: 'p',
    streamUrl: `/api/stream/p/${id}.mp3`,
  };
}

/** Generator for a non-empty queue of distinct tracks. */
const queueArb = fc
  .integer({ min: 1, max: 50 })
  .map((size) => Array.from({ length: size }, (_, i) => makeTrack(i)));

/**
 * Generator that yields a { queue, index } pair where index is a valid index
 * into the queue (0 <= index < queue.length).
 */
const queueAndIndexArb = queueArb.chain((queue) =>
  fc.record({
    queue: fc.constant(queue),
    index: fc.integer({ min: 0, max: queue.length - 1 }),
  }),
);

/** Construct a "currently playing" state at the given queue index. */
function playingState(queue: Track[], index: number): PlayerState {
  return {
    ...initialPlayerState,
    currentTrack: queue[index],
    queue,
    queueIndex: index,
    isPlaying: true,
    currentTime: 42,
    duration: 100,
  };
}

describe('Property 4: Queue advancement', () => {
  it('advances to index + 1 and keeps playing when not on the last track', () => {
    fc.assert(
      fc.property(queueAndIndexArb, ({ queue, index }) => {
        // Only meaningful when there is a following track.
        fc.pre(index < queue.length - 1);

        const state = playingState(queue, index);
        const next = playerReducer(state, { type: 'NEXT_TRACK' });

        expect(next.queueIndex).toBe(index + 1);
        expect(next.currentTrack).toBe(queue[index + 1]);
        expect(next.isPlaying).toBe(true);
        expect(next.currentTime).toBe(0);
      }),
      { numRuns: 200 },
    );
  });

  it('stops playback and stays on the last track when on the last track', () => {
    fc.assert(
      fc.property(queueArb, (queue) => {
        const lastIndex = queue.length - 1;
        const state = playingState(queue, lastIndex);
        const next = playerReducer(state, { type: 'NEXT_TRACK' });

        expect(next.isPlaying).toBe(false);
        expect(next.queueIndex).toBe(lastIndex);
        expect(next.currentTrack).toBe(queue[lastIndex]);
      }),
      { numRuns: 200 },
    );
  });

  it('TRACK_ENDED advances identically to NEXT_TRACK for any valid index', () => {
    fc.assert(
      fc.property(queueAndIndexArb, ({ queue, index }) => {
        const state = playingState(queue, index);
        const viaNext = playerReducer(state, { type: 'NEXT_TRACK' });
        const viaEnded = playerReducer(state, { type: 'TRACK_ENDED' });

        expect(viaEnded.queueIndex).toBe(viaNext.queueIndex);
        expect(viaEnded.currentTrack).toBe(viaNext.currentTrack);
        expect(viaEnded.isPlaying).toBe(viaNext.isPlaying);

        // Cross-check against the property specification directly.
        if (index < queue.length - 1) {
          expect(viaEnded.queueIndex).toBe(index + 1);
          expect(viaEnded.isPlaying).toBe(true);
        } else {
          expect(viaEnded.queueIndex).toBe(index);
          expect(viaEnded.isPlaying).toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });
});
