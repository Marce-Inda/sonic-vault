import { useEffect, useState } from 'react';
import './PlaylistView.css';
import type { Track } from '@shared/types';
import { formatDuration } from '@client/utils/formatDuration';
import { truncateText } from '@client/utils/truncateText';

export interface PlaylistViewProps {
  tracks: Track[];
  currentTrackId: string | null;
  selectedPlaylist?: string | null;
  availablePlaylists?: string[];
  playlists?: Playlist[];
  onPlayTrack: (track: Track, queue: Track[], index: number) => void;
  onAddTrackToPlaylist?: (playlistName: string, trackId: string) => void;
  onRemoveTrackFromPlaylist?: (playlistName: string, trackId: string) => void;
  onCreatePlaylist?: (name: string, trackId?: string) => Promise<void> | void;
}

export function sortTracksAlphabetically(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  );
}

type SortField = 'title' | 'artist' | 'duration';
type SortDirection = 'asc' | 'desc';

function PlaylistView({
  tracks,
  currentTrackId,
  selectedPlaylist,
  availablePlaylists = [],
  playlists = [],
  onPlayTrack,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onCreatePlaylist,
}: PlaylistViewProps) {
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [creatingForTrackId, setCreatingForTrackId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    if (activeMenuTrackId === null) return;
    const handleClickOutside = () => {
      setActiveMenuTrackId(null);
      setCreatingForTrackId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuTrackId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedTracks = (): Track[] => {
    return [...tracks].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      } else if (sortField === 'artist') {
        comparison = a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' });
      } else if (sortField === 'duration') {
        comparison = a.durationSeconds - b.durationSeconds;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const sortedTracks = getSortedTracks();

  const handlePlay = (track: Track) => {
    const queue = sortedTracks;
    const index = queue.findIndex((t) => t.id === track.id);
    onPlayTrack(track, queue, index);
  };

  if (tracks.length === 0) {
    return (
      <div className="playlist-view playlist-view--empty">
        <p className="playlist-view__empty-message">Esta playlist no tiene pistas.</p>
      </div>
    );
  }

  const userPlaylists = availablePlaylists.filter(
    (p) => !p.includes('Todas las canciones'),
  );

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '▲' : '▼';
  };

  const isTrackInPlaylist = (playlistName: string, trackId: string): boolean => {
    const targetPl = playlists.find((p) => p.name === playlistName);
    if (!targetPl) return false;
    return targetPl.tracks.some(
      (t) => t.id === trackId || t.fileName === trackId.split('/').pop()
    );
  };

  const handleCreateAndAdd = async (trackId: string) => {
    const name = newPlaylistName.trim();
    if (!name || !onCreatePlaylist) return;

    await onCreatePlaylist(name, trackId);

    setNewPlaylistName('');
    setCreatingForTrackId(null);
    setActiveMenuTrackId(null);
  };

  return (
    <div className="playlist-view">
      <table className="playlist-view__table">
        <thead>
          <tr className="playlist-view__head-row">
            <th
              scope="col"
              className="playlist-view__col playlist-view__col--title playlist-view__col--sortable"
              onClick={() => handleSort('title')}
              title="Ordenar por título"
            >
              Título <span className="playlist-view__sort-icon">{getSortIcon('title')}</span>
            </th>
            <th
              scope="col"
              className="playlist-view__col playlist-view__col--artist playlist-view__col--sortable"
              onClick={() => handleSort('artist')}
              title="Ordenar por artista"
            >
              Artista <span className="playlist-view__sort-icon">{getSortIcon('artist')}</span>
            </th>
            <th
              scope="col"
              className="playlist-view__col playlist-view__col--duration playlist-view__col--sortable"
              onClick={() => handleSort('duration')}
              title="Ordenar por duración"
            >
              Duración <span className="playlist-view__sort-icon">{getSortIcon('duration')}</span>
            </th>
            <th scope="col" className="playlist-view__col playlist-view__col--actions">
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTracks.map((track) => {
            const isPlaying = track.id === currentTrackId;
            const isMenuOpen = activeMenuTrackId === track.id;
            const rowClass = [
              'playlist-view__row',
              isPlaying ? 'playlist-view__row--playing' : '',
              isMenuOpen ? 'playlist-view__row--menu-open' : '',
            ].filter(Boolean).join(' ');
            return (
              <tr
                key={track.id}
                className={rowClass}
                aria-current={isPlaying ? 'true' : undefined}
                tabIndex={0}
                onClick={() => handlePlay(track)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePlay(track);
                  }
                }}
              >
                <td
                  className="playlist-view__cell playlist-view__cell--title"
                  title={track.title}
                >
                  {truncateText(track.title)}
                </td>
                <td
                  className="playlist-view__cell playlist-view__cell--artist"
                  title={track.artist}
                >
                  {truncateText(track.artist)}
                </td>
                <td className="playlist-view__cell playlist-view__cell--duration">
                  {formatDuration(track.durationSeconds)}
                </td>
                <td
                  className="playlist-view__cell playlist-view__cell--actions"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="playlist-view__action-menu-wrapper">
                    <button
                      type="button"
                      className="playlist-view__action-btn"
                      title="Opciones de playlist"
                      onClick={() => {
                        setActiveMenuTrackId(isMenuOpen ? null : track.id);
                        setCreatingForTrackId(null);
                      }}
                    >
                      +
                    </button>
                    {isMenuOpen && (
                      <div
                        className="playlist-view__dropdown"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div className="playlist-view__dropdown-header">
                          Añadir a playlist:
                        </div>
                        {userPlaylists.length === 0 ? (
                          <div className="playlist-view__dropdown-empty">
                            No hay playlists creadas
                          </div>
                        ) : (
                          userPlaylists.map((pName) => {
                            const included = isTrackInPlaylist(pName, track.id);
                            return (
                              <button
                                key={pName}
                                type="button"
                                className={`playlist-view__dropdown-item ${
                                  included ? 'playlist-view__dropdown-item--included' : ''
                                }`}
                                onClick={() => {
                                  if (included) {
                                    if (onRemoveTrackFromPlaylist) {
                                      onRemoveTrackFromPlaylist(pName, track.id);
                                    }
                                  } else {
                                    if (onAddTrackToPlaylist) {
                                      onAddTrackToPlaylist(pName, track.id);
                                    }
                                  }
                                  setActiveMenuTrackId(null);
                                }}
                              >
                                {included ? `✓ ${pName}` : pName}
                              </button>
                            );
                          })
                        )}

                        <hr className="playlist-view__dropdown-divider" />

                        {creatingForTrackId === track.id ? (
                          <form
                            className="playlist-view__new-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void handleCreateAndAdd(track.id);
                            }}
                          >
                            <input
                              type="text"
                              className="playlist-view__new-input"
                              placeholder="Nombre de la lista..."
                              value={newPlaylistName}
                              onChange={(e) => setNewPlaylistName(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void handleCreateAndAdd(track.id);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="playlist-view__new-btn"
                              disabled={!newPlaylistName.trim()}
                            >
                              Guardar
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            className="playlist-view__dropdown-item playlist-view__dropdown-item--add-new"
                            onClick={() => setCreatingForTrackId(track.id)}
                          >
                            ➕ Crear nueva playlist...
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PlaylistView;
