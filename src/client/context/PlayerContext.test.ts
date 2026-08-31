import { describe, it, expect } from 'vitest';
import { playerReducer, initialPlayerState, type PlayerState } from './PlayerContext';
import type { Track } from '@shared/types';

function makeTrack(id: string, title: string): Track {
  return {
    id,
    fileName: `${id}.mp3`,
    title,
    artist: 'Artista',
    album: '',
    durationSeconds: 100,
    playlist: 'p',
    streamUrl: `/api/stream/p/${id}.mp3`,
  };
}

const t1 = makeTrack('1', 'Uno');
const t2 = makeTrack('2', 'Dos');
const t3 = makeTrack('3', 'Tres');
const queue = [t1, t2, t3];

function playingState(index: number, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    ...initialPlayerState,
    currentTrack: queue[index],
    queue,
    queueIndex: index,
    isPlaying: true,
    duration: 100,
    ...overrides,
  };
}

describe('playerReducer', () => {
  it('PLAY_TRACK loads the track, queue and starts playing', () => {
    const next = playerReducer(initialPlayerState, {
      type: 'PLAY_TRACK',
      payload: { track: t2, queue, index: 1 },
    });
    expect(next.currentTrack).toBe(t2);
    expect(next.queueIndex).toBe(1);
    expect(next.isPlaying).toBe(true);
    expect(next.currentTime).toBe(0);
  });

  it('PAUSE and RESUME toggle isPlaying', () => {
    const paused = playerReducer(playingState(0), { type: 'PAUSE' });
    expect(paused.isPlaying).toBe(false);
    const resumed = playerReducer(paused, { type: 'RESUME' });
    expect(resumed.isPlaying).toBe(true);
  });

  it('RESUME does nothing without a current track', () => {
    const next = playerReducer(initialPlayerState, { type: 'RESUME' });
    expect(next.isPlaying).toBe(false);
  });

  it('NEXT_TRACK advances when not last', () => {
    const next = playerReducer(playingState(0), { type: 'NEXT_TRACK' });
    expect(next.queueIndex).toBe(1);
    expect(next.currentTrack).toBe(t2);
    expect(next.isPlaying).toBe(true);
    expect(next.currentTime).toBe(0);
  });

  it('NEXT_TRACK stops on last track and stays there', () => {
    const next = playerReducer(playingState(2), { type: 'NEXT_TRACK' });
    expect(next.queueIndex).toBe(2);
    expect(next.currentTrack).toBe(t3);
    expect(next.isPlaying).toBe(false);
  });

  it('TRACK_ENDED behaves like NEXT_TRACK', () => {
    const advanced = playerReducer(playingState(0), { type: 'TRACK_ENDED' });
    expect(advanced.queueIndex).toBe(1);
    const stopped = playerReducer(playingState(2), { type: 'TRACK_ENDED' });
    expect(stopped.isPlaying).toBe(false);
  });

  it('PREVIOUS_TRACK restarts when currentTime >= 3', () => {
    const next = playerReducer(playingState(1, { currentTime: 5 }), { type: 'PREVIOUS_TRACK' });
    expect(next.queueIndex).toBe(1);
    expect(next.currentTime).toBe(0);
  });

  it('PREVIOUS_TRACK goes to previous when currentTime < 3 and not first', () => {
    const next = playerReducer(playingState(1, { currentTime: 1 }), { type: 'PREVIOUS_TRACK' });
    expect(next.queueIndex).toBe(0);
    expect(next.currentTrack).toBe(t1);
    expect(next.currentTime).toBe(0);
  });

  it('PREVIOUS_TRACK restarts when on first track even if currentTime < 3', () => {
    const next = playerReducer(playingState(0, { currentTime: 1 }), { type: 'PREVIOUS_TRACK' });
    expect(next.queueIndex).toBe(0);
    expect(next.currentTime).toBe(0);
  });

  it('SEEK clamps to [0, duration]', () => {
    const state = playingState(0, { duration: 100 });
    expect(playerReducer(state, { type: 'SEEK', payload: -10 }).currentTime).toBe(0);
    expect(playerReducer(state, { type: 'SEEK', payload: 250 }).currentTime).toBe(100);
    expect(playerReducer(state, { type: 'SEEK', payload: 42 }).currentTime).toBe(42);
  });

  it('SET_VOLUME clamps to [0, 1] and updates isMuted', () => {
    const state = playingState(0);
    expect(playerReducer(state, { type: 'SET_VOLUME', payload: 1.5 }).volume).toBe(1);
    expect(playerReducer(state, { type: 'SET_VOLUME', payload: -0.5 }).volume).toBe(0);
    expect(playerReducer(state, { type: 'SET_VOLUME', payload: 0 }).isMuted).toBe(true);
    expect(playerReducer(state, { type: 'SET_VOLUME', payload: 0.3 }).isMuted).toBe(false);
  });

  it('TOGGLE_MUTE mutes then restores exact previous volume', () => {
    const state = playingState(0, { volume: 0.7 });
    const muted = playerReducer(state, { type: 'TOGGLE_MUTE' });
    expect(muted.isMuted).toBe(true);
    expect(muted.volume).toBe(0);
    expect(muted.previousVolume).toBe(0.7);
    const unmuted = playerReducer(muted, { type: 'TOGGLE_MUTE' });
    expect(unmuted.isMuted).toBe(false);
    expect(unmuted.volume).toBe(0.7);
  });

  it('SET_DURATION clamps negatives to 0', () => {
    const state = playingState(0);
    expect(playerReducer(state, { type: 'SET_DURATION', payload: 200 }).duration).toBe(200);
    expect(playerReducer(state, { type: 'SET_DURATION', payload: -5 }).duration).toBe(0);
  });

  it('TRACK_ERROR stops playback', () => {
    const next = playerReducer(playingState(0), { type: 'TRACK_ERROR', payload: 'boom' });
    expect(next.isPlaying).toBe(false);
  });

  it('TRACK_ERROR records a user-facing message naming the failed track (Req 2.7)', () => {
    const next = playerReducer(playingState(0), { type: 'TRACK_ERROR', payload: 'Mi Canción' });
    expect(next.lastError).toContain('Mi Canción');
  });

  it('TRACK_ERROR falls back to a generic name for an empty payload', () => {
    const next = playerReducer(playingState(0), { type: 'TRACK_ERROR', payload: '' });
    expect(next.lastError).not.toBeNull();
    expect(next.lastError).toContain('la pista');
  });

  it('CLEAR_ERROR clears a pending error message', () => {
    const errored = playerReducer(playingState(0), { type: 'TRACK_ERROR', payload: 'x' });
    expect(errored.lastError).not.toBeNull();
    const cleared = playerReducer(errored, { type: 'CLEAR_ERROR' });
    expect(cleared.lastError).toBeNull();
  });

  it('PLAY_TRACK clears any previously surfaced error', () => {
    const errored = playerReducer(playingState(0), { type: 'TRACK_ERROR', payload: 'x' });
    const played = playerReducer(errored, {
      type: 'PLAY_TRACK',
      payload: { track: t1, queue, index: 0 },
    });
    expect(played.lastError).toBeNull();
  });
});
