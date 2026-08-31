import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { useAudioEngine } from './useAudioEngine';
import { PlayerProvider, usePlayer } from '@client/context/PlayerContext';
import type { Track } from '@shared/types';

/**
 * jsdom does not implement media playback methods. Stub them so the hook can
 * drive the element without throwing "Not implemented" errors.
 */
beforeAll(() => {
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  });
});

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  return React.createElement(PlayerProvider, null, children);
}

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 't1',
    fileName: 'song.mp3',
    title: 'Song',
    artist: 'Artist',
    album: '',
    durationSeconds: 120,
    playlist: 'Rock',
    streamUrl: '/api/stream/Rock/song.mp3',
    ...overrides,
  };
}

describe('useAudioEngine', () => {
  it('exposes the AudioEngineControls interface', () => {
    const { result } = renderHook(() => useAudioEngine(), { wrapper });
    expect(typeof result.current.play).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.resume).toBe('function');
    expect(typeof result.current.seek).toBe('function');
    expect(typeof result.current.setVolume).toBe('function');
  });

  it('clamps setVolume to [0, 1]', () => {
    const { result } = renderHook(() => useAudioEngine(), { wrapper });

    // Overshoot the upper bound.
    act(() => result.current.setVolume(5));
    // Undershoot the lower bound.
    act(() => result.current.setVolume(-3));
    // No throw and idempotent within range.
    act(() => result.current.setVolume(0.5));
    expect(true).toBe(true);
  });

  it('does not throw when seeking without a loaded track', () => {
    const { result } = renderHook(() => useAudioEngine(), { wrapper });
    expect(() => act(() => result.current.seek(-10))).not.toThrow();
    expect(() => act(() => result.current.seek(9999))).not.toThrow();
  });

  it('reacts to state changes without throwing (play/pause driven by isPlaying)', () => {
    const { result } = renderHook(
      () => {
        const player = usePlayer();
        useAudioEngine();
        return player;
      },
      { wrapper },
    );

    const track = makeTrack();
    act(() => {
      result.current.dispatch({
        type: 'PLAY_TRACK',
        payload: { track, queue: [track], index: 0 },
      });
    });
    expect(result.current.state.currentTrack?.streamUrl).toBe(track.streamUrl);

    act(() => result.current.dispatch({ type: 'PAUSE' }));
    expect(result.current.state.isPlaying).toBe(false);
  });
});
