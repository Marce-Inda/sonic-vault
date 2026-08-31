// Feature: local-music-player, Property 6: Seek bounds invariant

/**
 * Property-based test for Property 6: Seek bounds invariant.
 *
 * For any seek operation with a target time and a track with a given duration,
 * the resulting playback position SHALL be clamped to the range [0, duration].
 *
 * Validates: Requirements 3.6
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { playerReducer, initialPlayerState, type PlayerState } from './PlayerContext';

/** Expected clamping behaviour mirroring the reducer's internal clamp. */
function expectedClamp(value: number, duration: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > duration) return duration;
  return value;
}

describe('Property 6: Seek bounds invariant', () => {
  it('clamps any dispatched SEEK target to the range [0, duration]', () => {
    fc.assert(
      fc.property(
        // Positive track duration.
        fc.float({ min: Math.fround(0.001), max: 100000, noNaN: true }),
        // Seek target that may be negative, within, or beyond the duration.
        fc.float({ min: -1000, max: 200000, noNaN: true }),
        (duration, seekTarget) => {
          const stateWithDuration: PlayerState = {
            ...initialPlayerState,
            duration,
          };

          const next: PlayerState = playerReducer(stateWithDuration, {
            type: 'SEEK',
            payload: seekTarget,
          });

          // Invariant: resulting position is always within [0, duration].
          expect(next.currentTime).toBeGreaterThanOrEqual(0);
          expect(next.currentTime).toBeLessThanOrEqual(duration);

          // Result equals the clamped target.
          expect(next.currentTime).toBe(expectedClamp(seekTarget, duration));
        },
      ),
      { numRuns: 200 },
    );
  });

  it('handles edge targets (exact bounds, extremes, NaN) correctly', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.001), max: 100000, noNaN: true }),
        fc.constantFrom(
          0,
          -0,
          -1,
          -1000,
          500000,
          Number.NEGATIVE_INFINITY,
          Number.POSITIVE_INFINITY,
          Number.NaN,
        ),
        (duration, seekTarget) => {
          const next = playerReducer(
            { ...initialPlayerState, duration },
            { type: 'SEEK', payload: seekTarget },
          );

          expect(next.currentTime).toBeGreaterThanOrEqual(0);
          expect(next.currentTime).toBeLessThanOrEqual(duration);
          expect(next.currentTime).toBe(expectedClamp(seekTarget, duration));
        },
      ),
      { numRuns: 200 },
    );
  });
});
