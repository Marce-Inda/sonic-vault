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
  /** True if the track is a video file (.mp4). */
  isVideo?: boolean;
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

// ---------------------------------------------------------------------------
// Lyrics, Phonetic & Translation models (Audio Hygiene & Karaoke Agent)
// ---------------------------------------------------------------------------

export interface LrcLine {
  /** Timestamp in seconds (e.g. 12.34). */
  timeSeconds: number;
  /** Formatted LRC timestamp string (e.g. "00:12.34"). */
  timestamp: string;
  /** Original lyrics text in original script (Hangul, Kanji, English, etc). */
  text: string;
  /** Phonetic romanization (Romaja for Korean, Rōmaji for Japanese, Pinyin for Chinese). */
  phonetic?: string;
  /** Spanish translation. */
  translationEs?: string;
  /** English translation. */
  translationEn?: string;
}

export interface SongLyrics {
  trackId: string;
  title: string;
  artist: string;
  language?: string;
  hasPhonetic: boolean;
  hasTranslationEs: boolean;
  hasTranslationEn: boolean;
  lines: LrcLine[];
}

export interface LyricsResponse {
  success: boolean;
  data?: SongLyrics;
  error?: string;
}

// ---------------------------------------------------------------------------
// Multi-Agent System models (AI Orchestrator)
// ---------------------------------------------------------------------------

export type AgentRole = 'orchestrator' | 'hygiene' | 'curator' | 'scout';

export interface AgentMessage {
  id: string;
  sender: AgentRole | 'user';
  content: string;
  timestamp: string;
  actionDetails?: {
    actionType?: 'create_playlist' | 'clean_metadata' | 'enrich_lyrics' | 'organize_board';
    targetPlaylist?: string;
    affectedTracks?: string[];
  };
}

export interface AgentChatRequest {
  message: string;
  currentPlaylist?: string;
  currentTrackId?: string;
}

export interface AgentChatResponse {
  success: boolean;
  reply: string;
  messages?: AgentMessage[];
  actionPerformed?: string;
  error?: string;
}



