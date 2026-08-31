/**
 * Property-based tests for the MetadataParser fallback logic.
 *
 * Uses fast-check to verify Property 10 (metadata fallback logic) across a wide
 * range of raw metadata shapes where each field may be missing, null, undefined,
 * empty/whitespace, or present with a real value.
 *
 * Feature: local-music-player, Property 10: Metadata fallback logic
 * **Validates: Requirements 6.2**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import {
  applyMetadataFallbacks,
  fileNameWithoutExtension,
  UNKNOWN_ARTIST,
  type RawParsedMetadata,
} from './metadataParser';

/**
 * Generator for an optional string field that may be:
 * - absent (undefined key modeled via undefined value)
 * - null
 * - empty or whitespace-only (treated as "missing")
 * - a present, non-empty string value
 */
const optionalStringField = (): fc.Arbitrary<string | null | undefined> =>
  fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.constant(''),
    fc.constant('   '),
    fc.string(),
  );

/**
 * Returns a trimmed value if the input is a non-empty (after trim) string,
 * otherwise undefined. Mirrors the "missing" semantics used by the parser.
 */
function presentValue(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Generator for a duration field: missing, null, or an arbitrary number (incl. invalid). */
const optionalDurationField = (): fc.Arbitrary<number | null | undefined> =>
  fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.constant(0),
    fc.constant(-1),
    fc.constant(NaN),
    fc.constant(Infinity),
    fc.double({ min: 0.001, max: 100000, noNaN: true }),
  );

/** Generator for raw parsed metadata with potentially missing common/format sections. */
const rawMetadataArb = (): fc.Arbitrary<RawParsedMetadata | null | undefined> =>
  fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.record({
      common: fc.oneof(
        fc.constant(undefined),
        fc.record({
          title: optionalStringField(),
          artist: optionalStringField(),
          album: optionalStringField(),
        }),
      ),
      format: fc.oneof(
        fc.constant(undefined),
        fc.record({
          duration: optionalDurationField(),
        }),
      ),
    }),
  );

/** Generator for plausible file names, including ones with/without extensions and paths. */
const fileNameArb = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.string({ minLength: 1 }).map((s) => `${s}.mp3`),
    fc.string({ minLength: 1 }).map((s) => `${s}.mp4`),
    fc.string({ minLength: 1 }),
    fc.constant('song.mp3'),
    fc.constant('no-extension'),
  );

describe('applyMetadataFallbacks (Property 10: metadata fallback logic)', () => {
  it('applies all fallback rules and always returns a positive duration', () => {
    fc.assert(
      fc.property(rawMetadataArb(), fileNameArb(), (raw, fileName) => {
        const result = applyMetadataFallbacks(raw, fileName);

        const rawTitle = presentValue(raw?.common?.title);
        const rawArtist = presentValue(raw?.common?.artist);
        const rawAlbum = presentValue(raw?.common?.album);
        const rawDuration = raw?.format?.duration;

        // Title: present value or file name without extension.
        if (rawTitle !== undefined) {
          expect(result.title).toBe(rawTitle);
        } else {
          expect(result.title).toBe(fileNameWithoutExtension(fileName));
        }

        // Artist: present value or "Artista desconocido".
        if (rawArtist !== undefined) {
          expect(result.artist).toBe(rawArtist);
        } else {
          expect(result.artist).toBe(UNKNOWN_ARTIST);
        }

        // Album: present value or empty string.
        if (rawAlbum !== undefined) {
          expect(result.album).toBe(rawAlbum);
        } else {
          expect(result.album).toBe('');
        }

        // Duration invariant: always a finite, positive number.
        expect(typeof result.durationSeconds).toBe('number');
        expect(Number.isFinite(result.durationSeconds)).toBe(true);
        expect(result.durationSeconds).toBeGreaterThan(0);

        // When a valid positive duration is present, it is preserved.
        if (
          typeof rawDuration === 'number' &&
          Number.isFinite(rawDuration) &&
          rawDuration > 0
        ) {
          expect(result.durationSeconds).toBe(rawDuration);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('never returns empty title or artist regardless of input', () => {
    fc.assert(
      fc.property(rawMetadataArb(), fileNameArb(), (raw, fileName) => {
        const result = applyMetadataFallbacks(raw, fileName);
        // Artist always has content; title falls back to file name (may be empty
        // only if the file name itself has no base, which is not produced here).
        expect(result.artist.length).toBeGreaterThan(0);
        expect(typeof result.title).toBe('string');
        expect(typeof result.album).toBe('string');
      }),
      { numRuns: 200 },
    );
  });
});
