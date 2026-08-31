import React, { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Track } from '@shared/types';

/**
 * Global playback state managed via useReducer.
 *
 * The reducer and `initialPlayerState` are exported directly so that
 * property-based tests can import and exercise them without rendering React.
 */
export interface PlayerState {
  /** Track currently loaded (null when nothing is playing). */
  currentTrack: Track | null;
  /** Ordered queue of tracks for the current playback session. */
  queue: Track[];
  /** Index of the current track within the queue. */
  queueIndex: number;
  /** Whether playback is active. */
  isPlaying: boolean;
  /** Current playback position in seconds. */
  currentTime: number;
  /** Total duration of the current track in seconds. */
  duration: number;
  /** Active volume in the range [0, 1]. */
  volume: number;
  /** Volume stored before muting, used to restore on unmute. */
  previousVolume: number;
  /** Whether the audio is currently muted. */
  isMuted: boolean;
  /** Whether shuffle playback mode is active. */
  isShuffle: boolean;
  /**
   * Human-readable message describing the most recent playback failure, or
   * null when there is no pending error.
   */
  lastError: string | null;
}

export type PlayerAction =
  | { type: 'PLAY_TRACK'; payload: { track: Track; queue: Track[]; index: number } }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'NEXT_TRACK' }
  | { type: 'PREVIOUS_TRACK' }
  | { type: 'SEEK'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'TRACK_ENDED' }
  | { type: 'UPDATE_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'TRACK_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

/** Default volume level (full volume). */
const DEFAULT_VOLUME = 1;

/** Seconds threshold that decides "restart" vs "previous track" behaviour. */
const PREVIOUS_RESTART_THRESHOLD = 3;

export const initialPlayerState: PlayerState = {
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: DEFAULT_VOLUME,
  previousVolume: DEFAULT_VOLUME,
  isMuted: false,
  isShuffle: false,
  lastError: null,
};

/** Clamp a numeric value to the inclusive range [min, max]. */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Advance the queue by one position.
 */
function advanceQueue(state: PlayerState): PlayerState {
  if (state.queue.length === 0) {
    return { ...state, isPlaying: false };
  }

  if (state.isShuffle && state.queue.length > 1) {
    let randomIndex = Math.floor(Math.random() * state.queue.length);
    if (randomIndex === state.queueIndex) {
      randomIndex = (randomIndex + 1) % state.queue.length;
    }
    return {
      ...state,
      queueIndex: randomIndex,
      currentTrack: state.queue[randomIndex],
      isPlaying: true,
      currentTime: 0,
      duration: 0,
    };
  }

  const isLast = state.queueIndex >= state.queue.length - 1;

  if (isLast) {
    return {
      ...state,
      isPlaying: false,
    };
  }

  const nextIndex = state.queueIndex + 1;
  return {
    ...state,
    queueIndex: nextIndex,
    currentTrack: state.queue[nextIndex],
    isPlaying: true,
    currentTime: 0,
    duration: 0,
  };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'TOGGLE_SHUFFLE':
      return { ...state, isShuffle: !state.isShuffle };

    case 'PLAY_TRACK': {
      const { track, queue, index } = action.payload;
      return {
        ...state,
        currentTrack: track,
        queue,
        queueIndex: index,
        isPlaying: true,
        currentTime: 0,
        duration: 0,
        // Starting a new track clears any previously surfaced error.
        lastError: null,
      };
    }

    case 'PAUSE':
      return { ...state, isPlaying: false };

    case 'RESUME':
      // Only resume if there is a track loaded.
      return state.currentTrack ? { ...state, isPlaying: true } : state;

    case 'NEXT_TRACK':
    case 'TRACK_ENDED':
      return advanceQueue(state);

    case 'PREVIOUS_TRACK': {
      // Restart current track if past the threshold or on the first track;
      // otherwise go to the previous track.
      const shouldRestart =
        state.currentTime >= PREVIOUS_RESTART_THRESHOLD || state.queueIndex <= 0;

      if (shouldRestart) {
        return { ...state, currentTime: 0, isPlaying: state.currentTrack ? true : state.isPlaying };
      }

      const prevIndex = state.queueIndex - 1;
      return {
        ...state,
        queueIndex: prevIndex,
        currentTrack: state.queue[prevIndex],
        isPlaying: true,
        currentTime: 0,
        duration: 0,
      };
    }

    case 'SEEK':
      // Clamp defensively to [0, duration].
      return { ...state, currentTime: clamp(action.payload, 0, state.duration) };

    case 'SET_VOLUME': {
      const volume = clamp(action.payload, 0, 1);
      return {
        ...state,
        volume,
        // A non-zero volume implies the audio is no longer muted; a zero
        // volume is effectively muted.
        isMuted: volume === 0,
      };
    }

    case 'TOGGLE_MUTE': {
      if (state.isMuted) {
        // Unmute: restore the exact previous volume.
        return {
          ...state,
          isMuted: false,
          volume: state.previousVolume,
        };
      }
      // Mute: store the current volume and set active volume to 0.
      return {
        ...state,
        isMuted: true,
        previousVolume: state.volume,
        volume: 0,
      };
    }

    case 'UPDATE_TIME':
      return { ...state, currentTime: clamp(action.payload, 0, state.duration || action.payload) };

    case 'SET_DURATION':
      return { ...state, duration: action.payload < 0 ? 0 : action.payload };

    case 'TRACK_ERROR': {
      // The audio engine is responsible for auto-advancing after an error;
      // here we mark playback as stopped for the failed track and record a
      // user-facing message naming the failed track so the UI can surface a
      // transient notification (Req 2.7). The payload is the failed track's
      // title (falling back to whatever identifier the engine provided).
      const failed = action.payload?.trim() ? action.payload : 'la pista';
      return {
        ...state,
        isPlaying: false,
        lastError: `No se pudo reproducir "${failed}". Se omitió la pista.`,
      };
    }

    case 'CLEAR_ERROR':
      return state.lastError === null ? state : { ...state, lastError: null };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// React context + provider
// ---------------------------------------------------------------------------

interface PlayerContextValue {
  state: PlayerState;
  dispatch: Dispatch<PlayerAction>;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);

  return (
    <PlayerContext.Provider value={{ state, dispatch }}>
      {children}
    </PlayerContext.Provider>
  );
}

/**
 * Access the player state and dispatch. Must be used within a PlayerProvider.
 */
export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
