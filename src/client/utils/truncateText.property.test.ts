// Feature: local-music-player, Property 11: Text truncation

/**
 * Property-based test for Property 11: Text truncation.
 *
 * For any string, `truncateText` SHALL return the original string unchanged
 * if its length is ≤ 50 characters, and SHALL return the first 50 characters
 * followed by "…" if its length exceeds 50 characters.
 *
 * Validates: Requirements 6.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { truncateText } from './truncateText';

const MAX_LENGTH = 50;
const ELLIPSIS = '…';

describe('Property 11: Text truncation', () => {
  it('returns strings of length <= 50 unchanged, and truncates longer strings to 50 chars + "…"', () => {
    fc.assert(
      fc.property(
        // Strings of length 0..200 covering below, at, and above the boundary.
        fc.string({ minLength: 0, maxLength: 200 }),
        (text) => {
          const result = truncateText(text);

          if (text.length <= MAX_LENGTH) {
            // Short (and boundary) strings are returned unchanged.
            expect(result).toBe(text);
          } else {
            // Longer strings become first 50 chars + ellipsis.
            expect(result).toBe(text.slice(0, MAX_LENGTH) + ELLIPSIS);
            // Result carries 50 characters plus the single ellipsis code unit.
            expect(result.length).toBe(MAX_LENGTH + 1);
            expect(result.endsWith(ELLIPSIS)).toBe(true);
            expect(result.slice(0, MAX_LENGTH)).toBe(text.slice(0, MAX_LENGTH));
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('handles boundary lengths exactly (49, 50, 51 characters)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(49, 50, 51, 100, 200),
        (targetLength) => {
          const text = 'a'.repeat(targetLength);
          const result = truncateText(text);

          if (targetLength <= MAX_LENGTH) {
            expect(result).toBe(text);
          } else {
            expect(result).toBe('a'.repeat(MAX_LENGTH) + ELLIPSIS);
            expect(result.length).toBe(MAX_LENGTH + 1);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
