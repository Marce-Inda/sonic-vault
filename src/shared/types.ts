/**
 * Shared data models and interfaces for SpotiMP4.
 *
 * These types are consumed by both the backend (file scanning, metadata
 * parsing, API responses) and the frontend (playback state, UI rendering).
 */

// ---------------------------------------------------------------------------
// Domain models (shared between client and server)
// ---------------------------------------------------------------------------

/**
 * A playlist corresponds to a first-level subfolder inside the "musica" folder.
 */
export interface Playlist {
  /** Name of the subfolder. */
  name: string;
  /** Number of tracks contained in the playlist. */
  trackCount: number;
  /** Tracks belonging to the playlist. */
  tracks: Track[];
}

/**
 * A single audio track (an .mp3 or .mp4 file inside a playlist folder).
 */
export interface Track {
  /** Unique identifier (derived from playlist + fileName). */
  id: string;
  /** File name including its extension. */
  fileName: string;
  /** Track title from metadata, or the file name without extension as fallback. */
  title: string;
  /** Artist from metadata, or "Artista desconocido" as fallback. */
  artist: string;
  /** Album from metadata, or an empty string as fallback. */
  album: string;
  /** Track duration in seconds. */
  durationSeconds: number;
  /** Name of the playlist (subfolder) that contains this track. */
  playlist: string;
  /** URL used to stream the audio: /api/stream/{playlist}/{fileName}. */
  streamUrl: string;
}

// ---------------------------------------------------------------------------
// API response models
// ---------------------------------------------------------------------------

/**
 * Response shape for `GET /api/playlists`.
 */
export interface PlaylistsResponse {
  /** Whether the scan succeeded. */
  success: boolean;
  /** The playlists found (empty when success is false). */
  data: Playlist[];
  /** Present when the "musica" folder is missing or inaccessible. */
  error?: string;
}

// ---------------------------------------------------------------------------
// File scanning models (backend)
// ---------------------------------------------------------------------------

/**
 * Result of scanning the "musica" folder.
 */
export interface ScanResult {
  /** Playlists discovered during the scan. */
  playlists: PlaylistInfo[];
  /** Errors encountered during the scan. */
  errors: ScanError[];
}

/**
 * A playlist folder and the audio files found directly within it.
 */
export interface PlaylistInfo {
  /** Name of the subfolder. */
  name: string;
  /** Absolute or relative path to the subfolder. */
  path: string;
  /** Audio files found at the first level of the subfolder. */
  tracks: TrackFile[];
}

/**
 * An audio file discovered during scanning.
 */
export interface TrackFile {
  /** File name including its extension. */
  fileName: string;
  /** Full path to the file on disk. */
  filePath: string;
  /** Supported audio extension. */
  extension: 'mp3' | 'mp4';
}

/**
 * An error encountered while scanning the "musica" folder.
 */
export interface ScanError {
  /** Type of error. */
  type: 'folder_not_found' | 'permission_denied';
  /** Human-readable error message. */
  message: string;
}

// ---------------------------------------------------------------------------
// Metadata model (backend)
// ---------------------------------------------------------------------------

/**
 * Audio metadata extracted from a track file (after fallbacks are applied).
 */
export interface TrackMetadata {
  /** Track title. */
  title: string;
  /** Track artist. */
  artist: string;
  /** Track album. */
  album: string;
  /** Track duration in seconds. */
  durationSeconds: number;
}

// ---------------------------------------------------------------------------
// Download models (asynchronous background downloader)
// ---------------------------------------------------------------------------

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'error';

export interface DownloadJob {
  id: string;
  query: string;
  playlist: string;
  status: DownloadStatus;
  progressPercent?: number;
  outputFileName?: string;
  error?: string;
  createdAt: string;
}

export interface DownloadRequest {
  query: string;
  playlist?: string;
  format?: 'mp3' | 'mp4';
}

export interface DownloadResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  error?: string;
}

export interface DownloadStatusResponse {
  success: boolean;
  jobs: DownloadJob[];
}

// ---------------------------------------------------------------------------
// Virtual Playlist models (Spotify-style virtual playlist manager)
// ---------------------------------------------------------------------------

export interface VirtualPlaylistDefinition {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
}

export interface CreatePlaylistRequest {
  name: string;
}

export interface AddTrackToPlaylistRequest {
  trackId: string;
}

export interface PlaylistActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}


