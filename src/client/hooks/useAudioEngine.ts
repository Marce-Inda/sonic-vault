import { useCallback, useEffect, useRef } from 'react';
import { usePlayer } from '@client/context/PlayerContext';

/**
 * Imperative controls exposed by {@link useAudioEngine}.
 *
 * These wrap direct interaction with the underlying `HTMLAudioElement` so that
 * UI components never touch the audio element directly.
 */
export interface AudioEngineControls {
  /** Load a new source and start playing it. */
  play: (src: string) => void;
  /** Pause playback at the current position. */
  pause: () => void;
  /** Resume playback from the current position. */
  resume: () => void;
  /** Seek to a time in seconds, clamped to [0, duration]. */
  seek: (time: number) => void;
  /** Set the volume, clamped to [0, 1]. */
  setVolume: (volume: number) => void;
}

/** Clamp a numeric value to the inclusive range [min, max]. */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Lazily create the shared `HTMLAudioElement`.
 *
 * `Audio` is only referenced inside the browser (or jsdom) at runtime, so the
 * guard keeps the hook safe if it is ever evaluated in an environment without
 * the constructor available.
 */
function createAudioElement(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') {
    return null;
  }
  return new Audio();
}

/**
 * Encapsulates all interaction with an `HTMLAudioElement`.
 *
 * The hook owns a single audio element (via a ref), wires its DOM events to
 * {@link PlayerAction} dispatches, and keeps the element in sync with the
 * player state (source, play/pause, volume/mute). It returns imperative
 * controls that clamp their inputs to valid ranges.
 *
 * Requirements: 2.1, 2.2, 2.7, 3.6, 3.7
 */
export function useAudioEngine(): AudioEngineControls {
  const { state, dispatch } = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Track the source currently loaded into the element so we only reset it
  // when the track actually changes (avoids restarting on unrelated updates).
  const loadedSrcRef = useRef<string | null>(null);

  // Mirror of the latest player state, readable from event handlers that are
  // registered once (their closure would otherwise capture a stale state).
  const stateRef = useRef(state);
  stateRef.current = state;

  // Ensure the audio element exists and its event listeners are wired exactly
  // once for the lifetime of the hook.
  useEffect(() => {
    if (audioRef.current === null) {
      audioRef.current = createAudioElement();
    }
    const audio = audioRef.current;
    if (audio === null) {
      return;
    }

    const handleTimeUpdate = (): void => {
      dispatch({ type: 'UPDATE_TIME', payload: audio.currentTime });
    };

    const handleDurationChange = (): void => {
      const { duration } = audio;
      if (Number.isFinite(duration) && duration > 0) {
        dispatch({ type: 'SET_DURATION', payload: duration });
      }
    };

    const handleEnded = (): void => {
      dispatch({ type: 'TRACK_ENDED' });
    };

    const handleError = (): void => {
      // Prefer the human-readable track title for the notification; fall back
      // to the element's source URL if no track title is available.
      const failed = stateRef.current.currentTrack?.title || audio.src || 'audio';
      // Mark the current track as errored (records a user-facing message),
      // then auto-advance to the next track in the queue (Req 2.7).
      dispatch({ type: 'TRACK_ERROR', payload: failed });
      dispatch({ type: 'NEXT_TRACK' });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [dispatch]);

  // ---- Imperative controls -------------------------------------------------

  const play = useCallback((src: string): void => {
    const audio = audioRef.current;
    if (audio === null) return;
    if (loadedSrcRef.current !== src) {
      audio.src = src;
      loadedSrcRef.current = src;
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay/decoding rejections surface via the 'error' event handler.
    });
  }, []);

  const pause = useCallback((): void => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback((): void => {
    const audio = audioRef.current;
    if (audio === null) return;
    void audio.play().catch(() => {
      /* handled by the 'error' listener */
    });
  }, []);

  const seek = useCallback((time: number): void => {
    const audio = audioRef.current;
    if (audio === null) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : time;
    audio.currentTime = clamp(time, 0, duration);
  }, []);

  const setVolume = useCallback((volume: number): void => {
    const audio = audioRef.current;
    if (audio === null) return;
    audio.volume = clamp(volume, 0, 1);
  }, []);

  // ---- Sync element with player state --------------------------------------

  // Load / switch source when the current track changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null) return;

    const src = state.currentTrack?.streamUrl ?? null;

    if (src === null) {
      // No track selected: pause and clear the loaded source.
      audio.pause();
      loadedSrcRef.current = null;
      return;
    }

    if (loadedSrcRef.current !== src) {
      audio.src = src;
      loadedSrcRef.current = src;
      audio.currentTime = 0;
    }
  }, [state.currentTrack?.streamUrl]);

  // Drive play/pause from the isPlaying flag.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null || state.currentTrack === null) return;

    if (state.isPlaying) {
      if (audio.paused) {
        void audio.play().catch(() => {
          /* handled by the 'error' listener */
        });
      }
    } else if (!audio.paused) {
      audio.pause();
    }
  }, [state.isPlaying, state.currentTrack]);

  // Reflect volume / mute changes onto the element. When muted the effective
  // volume is 0; otherwise it follows the clamped state volume (Req 3.7).
  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null) return;
    const effective = state.isMuted ? 0 : state.volume;
    audio.volume = clamp(effective, 0, 1);
  }, [state.volume, state.isMuted]);

  return { play, pause, resume, seek, setVolume };
}
