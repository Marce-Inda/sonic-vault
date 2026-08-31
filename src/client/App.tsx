import { useEffect, useMemo, useState } from 'react';
import './styles/theme.css';
import './styles/App.css';

import type { Playlist, Track } from '@shared/types';
import {
  addTrackToPlaylistApi,
  createPlaylistApi,
  deletePlaylistApi,
  fetchPlaylists,
  removeTrackFromPlaylistApi,
} from '@client/services/api';
import { PlayerProvider, usePlayer } from '@client/context/PlayerContext';
import { filterTracks } from '@client/utils/filterTracks';
import Sidebar from './components/Sidebar';
import PlaylistView from './components/PlaylistView';
import TrelloBoard from './components/TrelloBoard';
import SearchBar from './components/SearchBar';
import PlayerBar from './components/PlayerBar';
import DownloadBar from './components/DownloadBar';
import VideoPanel from './components/VideoPanel';
import KaraokeLyricsModal from './components/KaraokeLyricsModal';
import AgentChatDrawer from './components/AgentChatDrawer';
import TrackInfoTrelloModal from './components/TrackInfoTrelloModal';



/** Loading lifecycle for the initial playlists request. */
type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * AppContent — composes the SpotiMP4 UI and owns the data-loading state.
 *
 * Lives inside {@link PlayerProvider} so child components (and this component)
 * can call {@link usePlayer}.
 *
 * Responsibilities for task 12.1:
 *   - Load playlists from the backend on mount (Req 1.1).
 *   - Surface a user-facing error message when the scan fails or the API is
 *     unreachable (Req 1.3).
 *   - Manage the selected playlist and feed data to Sidebar / PlaylistView
 *     (Req 4.2, 4.5).
 *
 * Playback wiring (track click → PLAY_TRACK, stream URL) and the detailed
 * search empty-state are completed in tasks 12.2 / 12.3; the handlers are laid
 * out here as groundwork.
 */
/** Milliseconds the transient track-error notification stays visible. */
const ERROR_NOTIFICATION_TIMEOUT_MS = 5000;

function AppContent() {
  const { state, dispatch } = usePlayer();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [infoModalTrack, setInfoModalTrack] = useState<Track | null>(null);
  const [viewMode, setViewMode] = useState<'trello' | 'table'>('table');
  const [isVideoPanelOpen, setIsVideoPanelOpen] = useState(true);
  const [isKaraokeOpen, setIsKaraokeOpen] = useState(false);
  const [isAgentChatOpen, setIsAgentChatOpen] = useState(false);

  // Load playlists once on mount (Req 1.1). fetchPlaylists never throws: a
  // failed scan or network error resolves with success:false + an error.
  useEffect(() => {
    let cancelled = false;

    setStatus('loading');
    fetchPlaylists().then((response) => {
      if (cancelled) return;

      if (response.success) {
        setPlaylists(response.data);
        // Default the selection to the first playlist, or null when empty.
        setSelectedPlaylist(response.data.length > 0 ? response.data[0].name : null);
        setStatus('ready');
      } else {
        // Req 1.3: show a user-facing error and render no playlists.
        setPlaylists([]);
        setSelectedPlaylist(null);
        setErrorMessage(response.error ?? 'Ocurrió un error al cargar las playlists.');
        setStatus('error');
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-dismiss the transient track-error notification a few seconds after it
  // appears (Req 2.7). Re-armed whenever a new error message is set.
  useEffect(() => {
    if (state.lastError === null) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'CLEAR_ERROR' });
    }, ERROR_NOTIFICATION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state.lastError, dispatch]);

  // Tracks of the currently selected playlist (Req 4.2).
  const currentTracks = useMemo<Track[]>(() => {
    if (selectedPlaylist === null) return [];
    const playlist = playlists.find((p) => p.name === selectedPlaylist);
    return playlist ? playlist.tracks : [];
  }, [playlists, selectedPlaylist]);

  // Real-time filtered view of the current tracks (Req 7.2 / 7.4).
  const visibleTracks = useMemo<Track[]>(
    () => filterTracks(currentTracks, searchQuery),
    [currentTracks, searchQuery],
  );

  const totalVisibleTracks = useMemo<Track[]>(
    () => playlists.flatMap((p) => filterTracks(p.tracks, searchQuery)),
    [playlists, searchQuery],
  );

  // Selecting a playlist updates the main view; playback is unaffected
  // (full behaviour finalized in task 12.2, Req 4.5).
  const handleSelectPlaylist = (name: string): void => {
    setSelectedPlaylist(name);
    setSearchQuery('');
    setViewMode('table');
  };

  const handlePlayTrack = (track: Track, queue: Track[], index: number): void => {
    dispatch({ type: 'PLAY_TRACK', payload: { track, queue, index } });
  };


  const handleRefreshPlaylists = (): void => {
    fetchPlaylists().then((response) => {
      if (response.success) {
        setPlaylists(response.data);
      }
    });
  };

  const handleCreatePlaylist = async (name: string, trackIdToAdd?: string): Promise<void> => {
    const res = await createPlaylistApi(name);
    if (res.success) {
      if (trackIdToAdd) {
        await addTrackToPlaylistApi(name, trackIdToAdd);
      }
      await handleRefreshPlaylists();
      setSelectedPlaylist(name);
    }
  };

  const handleDeletePlaylist = async (name: string): Promise<void> => {
    const res = await deletePlaylistApi(name);
    if (res.success) {
      handleRefreshPlaylists();
      if (selectedPlaylist === name) {
        setSelectedPlaylist('🎵 Todas las canciones');
      }
    }
  };

  const handleAddTrackToPlaylist = async (
    playlistName: string,
    trackId: string,
  ): Promise<void> => {
    const res = await addTrackToPlaylistApi(playlistName, trackId);
    if (res.success) {
      handleRefreshPlaylists();
    }
  };

  const handleRemoveTrackFromPlaylist = async (
    playlistName: string,
    trackId: string,
  ): Promise<void> => {
    const res = await removeTrackFromPlaylistApi(playlistName, trackId);
    if (res.success) {
      handleRefreshPlaylists();
    }
  };

  const [appMode, setAppMode] = useState<'local' | 'stream'>('local');

  const handleOpenLocalFolder = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        await (window as any).showDirectoryPicker();
        handleRefreshPlaylists();
      } else {
        alert('Carga de carpeta local disponible en navegadores modernos (Chrome/Edge/Brave).');
      }
    } catch {
      // User cancelled picker
    }
  };

  const handleDownloadFromAgent = async (query: string) => {
    try {
      const targetPl = selectedPlaylist || 'Descargas';
      await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, playlistName: targetPl, format: 'mp3' }),
      });
      handleRefreshPlaylists();
    } catch {
      // Ignore
    }
  };

  return (
    <div className="app">
      <aside className="app__sidebar">
        <Sidebar
          playlists={playlists}
          selectedPlaylist={selectedPlaylist}
          mode={appMode}
          onSelectPlaylist={handleSelectPlaylist}
          onCreatePlaylist={handleCreatePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          onToggleMode={setAppMode}
          onOpenLocalFolder={handleOpenLocalFolder}
          onOpenAgentChat={() => setIsAgentChatOpen(true)}
        />
      </aside>

      <main className="app__main" aria-label="Vista principal">
        {status === 'loading' && (
          <p className="app__status" role="status">
            Cargando playlists…
          </p>
        )}

        {status === 'error' && (
          <p className="app__error" role="alert">
            {errorMessage}
          </p>
        )}

        {status === 'ready' && (
          <>
            <DownloadBar
              playlists={playlists.map((p) => p.name)}
              selectedPlaylist={selectedPlaylist}
              mode={appMode}
              onDownloadComplete={handleRefreshPlaylists}
            />

            <div className="app__toolbar">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>

            {totalVisibleTracks.length === 0 && searchQuery.trim() !== '' ? (
              <p className="app__no-results" role="status">
                No se encontraron pistas
              </p>
            ) : (
              <TrelloBoard
                playlists={playlists}
                currentTrackId={state.currentTrack?.id ?? null}
                searchQuery={searchQuery}
                onPlayTrack={handlePlayTrack}
                onAddTrackToPlaylist={handleAddTrackToPlaylist}
                onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                onCreatePlaylist={handleCreatePlaylist}
                onOpenInfoModal={(track) => setInfoModalTrack(track)}
              />
            )}
          </>
        )}
      </main>

      <VideoPanel
        track={state.currentTrack}
        isPlaying={state.isPlaying}
        currentTime={state.currentTime}
        isOpen={isVideoPanelOpen}
        onClose={() => setIsVideoPanelOpen(false)}
        onOpenInfoModal={(track) => setInfoModalTrack(track)}
      />

      <TrackInfoTrelloModal
        track={infoModalTrack}
        isOpen={Boolean(infoModalTrack)}
        onClose={() => setInfoModalTrack(null)}
        onDownloadTrack={handleDownloadFromAgent}
      />

      <footer className="app__player" aria-label="Barra de reproducción">
        <PlayerBar
          onToggleVideoPanel={() => setIsVideoPanelOpen((prev) => !prev)}
          onOpenKaraoke={() => setIsKaraokeOpen(true)}
          onOpenAgentChat={() => setIsAgentChatOpen(true)}
          isVideoPanelOpen={isVideoPanelOpen}
        />
      </footer>

      <KaraokeLyricsModal
        track={state.currentTrack}
        currentTime={state.currentTime}
        isOpen={isKaraokeOpen}
        onClose={() => setIsKaraokeOpen(false)}
      />

      <AgentChatDrawer
        isOpen={isAgentChatOpen}
        onClose={() => setIsAgentChatOpen(false)}
        onRefreshPlaylists={handleRefreshPlaylists}
        onDownloadTrack={handleDownloadFromAgent}
      />

      {/* Transient notification when a track fails to play (Req 2.7). It is
          auto-dismissed and can also be closed manually. */}
      {state.lastError !== null && (
        <div className="app__notification" role="alert">
          <span className="app__notification-message">{state.lastError}</span>
          <button
            type="button"
            className="app__notification-close"
            aria-label="Cerrar notificación"
            onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * App — root component. Wraps {@link AppContent} in {@link PlayerProvider} so
 * playback state (usePlayer) is available throughout the tree.
 */
function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}

export default App;
