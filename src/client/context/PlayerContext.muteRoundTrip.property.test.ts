// Feature: local-music-player, Property 8: Mute/unmute round trip
//
// Property 8: Mute/unmute round trip
// For any volume level v in [0, 1], muting SHALL set the active volume to 0
// while preserving v as previousVolume, and subsequently unmuting SHALL restore
// the active volume to exactly v.
//
// Validates: Requirements 3.8, 3.9

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { playerReducer, initialPlayerState, type PlayerState } from './PlayerContext';

describe('PlayerContext — Property 8: Mute/unmute round trip', () => {
  it('muting zeroes the active volume while preserving v, and unmuting restores exactly v', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (v) => {
        // Start from an unmuted state with the active volume set to v.
        const start: PlayerState = {
          ...initialPlayerState,
          volume: v,
          isMuted: false,
        };

        // Mute: active volume becomes 0, v is preserved as previousVolume.
        const muted = playerReducer(start, { type: 'TOGGLE_MUTE' });
        expect(muted.volume).toBe(0);
        expect(muted.isMuted).toBe(true);
        expect(muted.previousVolume).toBe(v);

        // Unmute: the active volume is restored to exactly v.
        const unmuted = playerReducer(muted, { type: 'TOGGLE_MUTE' });
        expect(unmuted.volume).toBe(v);
        expect(unmuted.isMuted).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});
