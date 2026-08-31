// Feature: local-music-player, Property 5: Previous track decision logic
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { playerReducer, initialPlayerState, type PlayerState } from './PlayerContext';
import type { Track } from '@shared/types';

/**
 * Property 5: Previous track decision logic
 *
 * For any current playback time in seconds and any queue index, handlePrevious
 * (the PREVIOUS_TRACK reducer branch) SHALL return 'restart' if currentTime >= 3
 * OR queueIndex === 0, and SHALL return 'previous' only if currentTime < 3 AND
 * queueIndex > 0.
 *
 * Observable outcomes on a playing state:
 *  - 'restart'  → same queueIndex, currentTime reset to 0
 *  - 'previous' → queueIndex decreased by 1, currentTime reset to 0
 *
 * Validates: Requirements 3.3, 3.4, 3.5
 */

const PREVIOUS_RESTART_THRESHOLD = 3;

function makeTrack(id: string): Track {
  return {
    id,
    fileName: `${id}.mp3`,
    title: `Title ${id}`,
    artist: 'Artista',
    album: '',
    durationSeconds: 600,
    playlist: 'p',
    streamUrl: `/api/stream/p/${id}.mp3`,
  };
}

function buildQueue(size: number): Track[] {
  return Array.from({ length: size }, (_, i) => makeTrack(String(i)));
}

function playingState(queue: Track[], index: number, currentTime: number): PlayerState {
  return {
    ...initialPlayerState,
    currentTrack: queue[index],
    queue,
    queueIndex: index,
    isPlaying: true,
    currentTime,
    duration: 600,
  };
}

describe('Property 5: Previous track decision logic', () => {
  it('PREVIOUS_TRACK restarts or goes previous per the decision rule', () => {
    fc.assert(
      fc.property(
        // Queue size between 1 and 20 tracks.
        fc.integer({ min: 1, max: 20 }),
        // currentTime in seconds as a float in [0, 600].
        fc.float({ min: 0, max: 600, noNaN: true }),
        // A fractional selector used to derive a valid queue index.
        fc.double({ min: 0, max: 0.999999, noNaN: true }),
        (queueSize, currentTime, indexSelector) => {
          const queue = buildQueue(queueSize);
          const queueIndex = Math.floor(indexSelector * queueSize);

          const state = playingState(queue, queueIndex, currentTime);
          const next = playerReducer(state, { type: 'PREVIOUS_TRACK' });

          const expectRestart =
            currentTime >= PREVIOUS_RESTART_THRESHOLD || queueIndex === 0;

          if (expectRestart) {
            // 'restart': stay on the same track, reset elapsed time to 0.
            expect(next.queueIndex).toBe(queueIndex);
            expect(next.currentTrack).toBe(queue[queueIndex]);
            expect(next.currentTime).toBe(0);
          } else {
            // 'previous': only when currentTime < 3 AND queueIndex > 0.
            expect(currentTime).toBeLessThan(PREVIOUS_RESTART_THRESHOLD);
            expect(queueIndex).toBeGreaterThan(0);
            expect(next.queueIndex).toBe(queueIndex - 1);
            expect(next.currentTrack).toBe(queue[queueIndex - 1]);
            expect(next.currentTime).toBe(0);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
