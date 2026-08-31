import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';
import PlayerBar from './PlayerBar';
import { PlayerProvider, usePlayer, type PlayerAction } from '@client/context/PlayerContext';
import type { Track } from '@shared/types';

/**
 * jsdom does not implement media playback. Stub the methods the audio engine
 * touches so rendering PlayerBar (which mounts useAudioEngine) does not throw.
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

afterEach(cleanup);

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 't1',
    fileName: 'song.mp3',
    title: 'Canción de prueba',
    artist: 'Artista de prueba',
    album: '',
    durationSeconds: 120,
    playlist: 'Rock',
    streamUrl: '/api/stream/Rock/song.mp3',
    ...overrides,
  };
}

/**
 * Renders PlayerBar within a PlayerProvider and exposes a `dispatch` function
 * so tests can drive the player state (e.g. PLAY_TRACK) from outside.
 */
function renderPlayerBar(): { dispatch: (action: PlayerAction) => void } {
  let captured: (action: PlayerAction) => void = () => {};

  function DispatchCapture(): null {
    const { dispatch } = usePlayer();
    captured = dispatch;
    return null;
  }

  render(
    <PlayerProvider>
      <DispatchCapture />
      <PlayerBar />
    </PlayerProvider>
  );

  return {
    dispatch: (action) => {
      act(() => captured(action));
    },
  };
}

describe('PlayerBar', () => {
  it('disables all controls and shows no track info when no track is active (5.6)', () => {
    renderPlayerBar();

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Progreso de la pista' })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Volumen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Silenciar' })).toBeDisabled();

    // No track info rendered.
    expect(screen.queryByText('Canción de prueba')).not.toBeInTheDocument();
    expect(screen.queryByText('Artista de prueba')).not.toBeInTheDocument();
  });

  it('enables controls and shows track info after PLAY_TRACK (5.3, 6.3)', () => {
    const track = makeTrack();
    const { dispatch } = renderPlayerBar();

    // Start playback of a track (queue with a single track).
    dispatch({ type: 'PLAY_TRACK', payload: { track, queue: [track], index: 0 } });

    // Track info is shown (Req 6.3).
    expect(screen.getByText('Canción de prueba')).toBeInTheDocument();
    expect(screen.getByText('Artista de prueba')).toBeInTheDocument();

    // Controls are enabled.
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
    // Playing → the play/pause button now shows the pause affordance.
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
    expect(screen.getByRole('slider', { name: 'Volumen' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Silenciar' })).toBeEnabled();
  });

  it('toggles between play and pause affordances (2.3, 2.4)', () => {
    const track = makeTrack();
    const { dispatch } = renderPlayerBar();

    dispatch({ type: 'PLAY_TRACK', payload: { track, queue: [track], index: 0 } });

    // While playing, the button pauses.
    const pauseButton = screen.getByRole('button', { name: 'Pausar' });
    fireEvent.click(pauseButton);

    // After pausing, the button offers to resume playback.
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeInTheDocument();
  });
});
