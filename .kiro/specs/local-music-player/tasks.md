# Implementation Plan: Local Music Player (SpotiMP4)

## Overview

Implementación incremental de un reproductor de música local con backend Node.js/Express y frontend React/Vite/TypeScript. El servidor escanea la carpeta "musica", extrae metadatos ID3/MP4 y sirve archivos de audio como streams. El frontend presenta una interfaz estilo Spotify con tonos magenta/rosa y controla la reproducción vía HTML5 Audio.

## Tasks

- [x] 1. Set up project structure and shared types
  - [x] 1.1 Initialize project with Vite, React, TypeScript, Express, and configure dependencies
    - Create `package.json` with dependencies: express, music-metadata, cors, vitest, fast-check, @testing-library/react, supertest
    - Configure Vite for React + TypeScript with proxy to Express dev server
    - Configure `tsconfig.json` for both client and server
    - Create directory structure: `src/server/`, `src/client/`, `src/shared/`
    - _Requirements: 1.1, 2.1, 5.1_

  - [x] 1.2 Define shared data models and interfaces
    - Create `src/shared/types.ts` with interfaces: `Playlist`, `Track`, `PlaylistsResponse`, `ScanResult`, `PlaylistInfo`, `TrackFile`, `ScanError`, `TrackMetadata`
    - Ensure `Track` includes: id, fileName, title, artist, album, durationSeconds, playlist, streamUrl
    - _Requirements: 6.1, 6.2, 1.1, 1.2_

- [x] 2. Implement backend file scanning service
  - [x] 2.1 Implement FileScanner service (`src/server/services/fileScanner.ts`)
    - Scan "musica" folder and list first-level subfolders as playlists
    - Index only `.mp3` and `.mp4` files within each subfolder, excluding nested subdirectories
    - Return playlists sorted alphabetically (case-insensitive)
    - Handle missing folder with appropriate error in `ScanResult`
    - Ignore audio files directly in "musica" root (not inside a subfolder)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Write property test for playlist alphabetical sorting
    - **Property 1: Playlist alphabetical sorting**
    - **Validates: Requirements 1.1**

  - [x] 2.3 Write property test for file extension filtering
    - **Property 2: File extension filtering**
    - **Validates: Requirements 1.2**

- [x] 3. Implement backend metadata parsing service
  - [x] 3.1 Implement MetadataParser service (`src/server/services/metadataParser.ts`)
    - Use `music-metadata` to extract title, artist, album, duration from MP3 (ID3) and MP4 files
    - Apply fallback rules: no title → filename without extension, no artist → "Artista desconocido", no album → empty string
    - Ensure duration is always returned as a positive number
    - _Requirements: 6.1, 6.2_

  - [x] 3.2 Write property test for metadata fallback logic
    - **Property 10: Metadata fallback logic**
    - **Validates: Requirements 6.2**

- [x] 4. Implement backend API routes and stream controller
  - [x] 4.1 Implement API route `GET /api/playlists` (`src/server/routes/playlists.ts`)
    - Combine FileScanner + MetadataParser to return full playlist data
    - Return `PlaylistsResponse` with success flag, data array, and optional error
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2_

  - [x] 4.2 Implement StreamController and `GET /api/stream/:playlist/:track` (`src/server/controllers/streamController.ts`)
    - Serve audio files with correct MIME type (audio/mpeg for mp3, audio/mp4 for mp4)
    - Support HTTP Range Requests for seeking within the audio file
    - Return 404 if file not found
    - _Requirements: 2.1, 3.6_

  - [x] 4.3 Create Express app entry point (`src/server/index.ts`)
    - Wire routes, configure CORS, serve static assets in production
    - _Requirements: 1.1, 2.1_

- [x] 5. Checkpoint - Backend verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement frontend state management and audio engine
  - [x] 6.1 Implement PlayerContext with useReducer (`src/client/context/PlayerContext.tsx`)
    - Define `PlayerState` and `PlayerAction` types as specified in design
    - Implement reducer handling: PLAY_TRACK, PAUSE, RESUME, NEXT_TRACK, PREVIOUS_TRACK, SEEK, SET_VOLUME, TOGGLE_MUTE, TRACK_ENDED, UPDATE_TIME, SET_DURATION, TRACK_ERROR
    - Implement previous track logic: restart if currentTime >= 3s or first track, go previous if currentTime < 3s
    - Implement queue advancement: next track if not last, stop if last
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.8, 3.9_

  - [x] 6.2 Write property test for queue advancement
    - **Property 4: Queue advancement**
    - **Validates: Requirements 2.5, 2.6, 3.1, 3.2**

  - [x] 6.3 Write property test for previous track decision logic
    - **Property 5: Previous track decision logic**
    - **Validates: Requirements 3.3, 3.4, 3.5**

  - [x] 6.4 Write property test for volume clamping
    - **Property 7: Volume clamping**
    - **Validates: Requirements 3.7**

  - [x] 6.5 Write property test for mute/unmute round trip
    - **Property 8: Mute/unmute round trip**
    - **Validates: Requirements 3.8, 3.9**

  - [x] 6.6 Implement useAudioEngine hook (`src/client/hooks/useAudioEngine.ts`)
    - Encapsulate HTMLAudioElement interaction: play, pause, resume, seek, setVolume
    - Clamp seek to [0, duration] and volume to [0, 1]
    - Wire timeupdate, ended, error events to dispatch PlayerActions
    - On error: dispatch TRACK_ERROR, auto-advance to next track
    - _Requirements: 2.1, 2.2, 2.7, 3.6, 3.7_

  - [x] 6.7 Write property test for seek bounds invariant
    - **Property 6: Seek bounds invariant**
    - **Validates: Requirements 3.6**

- [x] 7. Implement frontend utility functions
  - [x] 7.1 Implement formatDuration utility (`src/client/utils/formatDuration.ts`)
    - Return "mm:ss" for durations < 3600s, "hh:mm:ss" for >= 3600s
    - Zero-pad each component to 2 digits
    - _Requirements: 2.2, 6.4_

  - [x] 7.2 Write property test for duration formatting
    - **Property 3: Duration formatting**
    - **Validates: Requirements 2.2, 6.4**

  - [x] 7.3 Implement truncateText utility (`src/client/utils/truncateText.ts`)
    - Return original string if length ≤ 50, otherwise first 50 chars + "…"
    - _Requirements: 6.5_

  - [x] 7.4 Write property test for text truncation
    - **Property 11: Text truncation**
    - **Validates: Requirements 6.5**

  - [x] 7.5 Implement filterTracks utility (`src/client/utils/filterTracks.ts`)
    - Filter tracks by title or artist containing query (case-insensitive)
    - Return all tracks when query is empty
    - _Requirements: 7.2, 7.4_

  - [x] 7.6 Write property test for search filter correctness
    - **Property 12: Search filter correctness**
    - **Validates: Requirements 7.2, 7.4, 7.6**

- [x] 8. Checkpoint - State management and utilities verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement frontend UI components - Layout and Sidebar
  - [x] 9.1 Implement App layout and CSS theme (`src/client/App.tsx`, `src/client/styles/`)
    - Set up three-section layout: Sidebar (left), MainView (center), PlayerBar (bottom fixed)
    - Define CSS custom properties for magenta/pink theme (HSL tones 300°–340°, background ≤ 20% luminosity)
    - Apply sans-serif font family and 4px/8px spacing grid
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 9.2 Implement Sidebar component (`src/client/components/Sidebar.tsx`)
    - Display list of playlists with name and track count
    - Highlight currently selected playlist
    - Handle click to select playlist
    - _Requirements: 4.1, 4.2, 4.4_

- [x] 10. Implement frontend UI components - Main View
  - [x] 10.1 Implement PlaylistView component (`src/client/components/PlaylistView.tsx`)
    - Display tracks with title, artist, and formatted duration
    - Truncate title/artist exceeding 50 characters with "…"
    - Highlight currently playing track with magenta accent color
    - Handle click to play track and set queue alphabetically
    - _Requirements: 4.2, 4.3, 5.4, 6.4, 6.5_

  - [x] 10.2 Write property test for queue alphabetical ordering
    - **Property 9: Queue alphabetical ordering**
    - **Validates: Requirements 4.3**

  - [x] 10.3 Implement SearchBar component (`src/client/components/SearchBar.tsx`)
    - Text input field at top of MainView
    - Filter tracks in real-time on each keystroke using filterTracks utility
    - Show "No se encontraron pistas" message when no results
    - Set queue from filtered results when playing from search
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 11. Implement frontend UI components - Player Bar
  - [x] 11.1 Implement PlayerBar component (`src/client/components/PlayerBar.tsx`)
    - Show current track title and artist (TrackInfo section)
    - Center playback controls: previous, play/pause, next buttons
    - Display ProgressBar with elapsed time and total duration
    - Show VolumeControl with slider and mute button
    - Disable all controls when no track is active
    - _Requirements: 5.3, 5.6, 2.2, 2.3, 2.4, 3.1, 3.3, 6.3_

  - [x] 11.2 Implement ProgressBar component (`src/client/components/ProgressBar.tsx`)
    - Interactive bar allowing drag/click to seek
    - Display current time and total duration in formatted style
    - _Requirements: 3.6, 2.2_

  - [x] 11.3 Implement VolumeControl component (`src/client/components/VolumeControl.tsx`)
    - Volume slider from 0% to 100% in 1% increments
    - Mute/unmute toggle button
    - _Requirements: 3.7, 3.8, 3.9_

- [x] 12. Integration and wiring
  - [x] 12.1 Wire frontend to backend API
    - Create API client service (`src/client/services/api.ts`) to fetch playlists
    - Load playlists on app mount, handle API errors with user-facing message
    - Pass playlist data to Sidebar and PlaylistView
    - _Requirements: 1.1, 1.3, 4.2, 4.5_

  - [x] 12.2 Wire playlist selection and playback flow
    - Connect Sidebar selection to PlaylistView update
    - Connect track click to PlayerContext PLAY_TRACK dispatch
    - Connect useAudioEngine to stream URL from backend
    - Ensure playlist change while playing does not interrupt current playback
    - _Requirements: 4.2, 4.3, 4.5, 2.1, 2.5_

  - [x] 12.3 Handle error states and edge cases
    - Display error when "musica" folder not found
    - Show empty playlist indication (0 tracks)
    - Show error notification when a track fails and auto-skip to next
    - Show "No se encontraron pistas" for empty search results
    - _Requirements: 1.3, 1.4, 2.7, 7.5_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend must be functional before frontend integration tasks
- CSS custom properties enable easy theming adjustments

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1", "4.3"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "4.1", "4.2"] },
    { "id": 4, "tasks": ["6.1", "7.1", "7.3", "7.5", "9.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "6.5", "6.6", "7.2", "7.4", "7.6", "9.2"] },
    { "id": 6, "tasks": ["6.7", "10.1", "10.3"] },
    { "id": 7, "tasks": ["10.2", "11.1", "11.2", "11.3"] },
    { "id": 8, "tasks": ["12.1"] },
    { "id": 9, "tasks": ["12.2", "12.3"] }
  ]
}
```
