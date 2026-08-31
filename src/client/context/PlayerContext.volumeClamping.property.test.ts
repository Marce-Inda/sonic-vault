// Feature: local-music-player, Property 7: Volume clamping

/**
 * Property-based test for Property 7: Volume clamping.
 *
 * For any volume value set by the user, the resulting volume level SHALL be
 * clamped to the range [0, 1] (representing 0% to 100%).
 *
 * Validates: Requirements 3.7
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { playerReducer, initialPlayerState, type PlayerState } from './PlayerContext';

/** Expected clamping behaviour mirroring the reducer's internal clamp. */
function expectedClamp(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

describe('Property 7: Volume clamping', () => {
  it('clamps any dispatched SET_VOLUME value to the range [0, 1]', () => {
    fc.assert(
      fc.property(
        // Floats spanning below, within, and above the valid range.
        fc.float({ min: -1, max: 2, noNaN: true }),
        (rawVolume) => {
          const next: PlayerState = playerReducer(initialPlayerState, {
            type: 'SET_VOLUME',
            payload: rawVolume,
          });

          // Invariant: resulting volume is always within [0, 1].
          expect(next.volume).toBeGreaterThanOrEqual(0);
          expect(next.volume).toBeLessThanOrEqual(1);

          // Result equals the clamped input.
          expect(next.volume).toBe(expectedClamp(rawVolume));
        },
      ),
      { numRuns: 200 },
    );
  });

  it('handles edge values (exact bounds, extremes, NaN) correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          0,
          1,
          -0,
          0.5,
          -1000,
          1000,
          Number.NEGATIVE_INFINITY,
          Number.POSITIVE_INFINITY,
          Number.NaN,
        ),
        (rawVolume) => {
          const next = playerReducer(initialPlayerState, {
            type: 'SET_VOLUME',
            payload: rawVolume,
          });

          expect(next.volume).toBeGreaterThanOrEqual(0);
          expect(next.volume).toBeLessThanOrEqual(1);
          expect(next.volume).toBe(expectedClamp(rawVolume));
        },
      ),
      { numRuns: 200 },
    );
  });
});
