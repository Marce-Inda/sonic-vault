// Feature: local-music-player, Property 3: Duration formatting

/**
 * Property-based test for Property 3: Duration formatting.
 *
 * For any non-negative duration in seconds, formatDuration SHALL return a
 * string in "mm:ss" format when the duration is less than 3600 seconds, and
 * "hh:mm:ss" format when the duration is 3600 seconds or more, where each
 * component is zero-padded to 2 digits.
 *
 * Validates: Requirements 2.2, 6.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { formatDuration } from './formatDuration';

const MM_SS = /^(\d{2}):(\d{2})$/;
const HH_MM_SS = /^(\d{2}):(\d{2}):(\d{2})$/;

describe('Property 3: Duration formatting', () => {
  it('formats any non-negative duration in the correct zero-padded format', () => {
    fc.assert(
      fc.property(
        // Non-negative durations spanning sub-hour and multi-hour ranges,
        // including fractional seconds.
        fc.double({ min: 0, max: 100000, noNaN: true }),
        (seconds) => {
          const result = formatDuration(seconds);
          const total = Math.floor(seconds);

          if (total < 3600) {
            // Format must be mm:ss with each component 2 digits.
            const match = MM_SS.exec(result);
            expect(match).not.toBeNull();

            const minutes = Number(match![1]);
            const secs = Number(match![2]);

            // Seconds component always in [0, 59].
            expect(secs).toBeGreaterThanOrEqual(0);
            expect(secs).toBeLessThanOrEqual(59);

            // Parsing the components back yields the floored total.
            expect(minutes * 60 + secs).toBe(total);
          } else {
            // Format must be hh:mm:ss with each component 2 digits.
            const match = HH_MM_SS.exec(result);
            expect(match).not.toBeNull();

            const hours = Number(match![1]);
            const minutes = Number(match![2]);
            const secs = Number(match![3]);

            // Minutes and seconds components always in [0, 59].
            expect(minutes).toBeGreaterThanOrEqual(0);
            expect(minutes).toBeLessThanOrEqual(59);
            expect(secs).toBeGreaterThanOrEqual(0);
            expect(secs).toBeLessThanOrEqual(59);

            // Parsing the components back yields the floored total.
            expect(hours * 3600 + minutes * 60 + secs).toBe(total);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('handles boundary values around the 3600s threshold', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(0, 59, 60, 3599, 3600, 3601, 7199, 7200, 359999),
        (seconds) => {
          const result = formatDuration(seconds);

          if (seconds < 3600) {
            expect(MM_SS.test(result)).toBe(true);
          } else {
            expect(HH_MM_SS.test(result)).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
