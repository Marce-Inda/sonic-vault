import { useEffect, useState } from 'react';
import './TrelloBoard.css';
import type { Playlist, Track } from '@shared/types';
import { formatDuration } from '@client/utils/formatDuration';
import { truncateText } from '@client/utils/truncateText';
import { filterTracks } from '@client/utils/filterTracks';

export interface TrelloBoardProps {
  playlists: Playlist[];
  currentTrackId: string | null;
  searchQuery?: string;
  onPlayTrack: (track: Track, queue: Track[], index: number) => void;
  onAddTrackToPlaylist?: (playlistName: string, trackId: string) => void;
  onRemoveTrackFromPlaylist?: (playlistName: string, trackId: string) => void;
  onDeletePlaylist?: (name: string) => void;
  onCreatePlaylist?: (name: string, trackId?: string) => Promise<void> | void;
  onOpenInfoModal?: (track: Track) => void;
}

export function TrelloBoard({
  playlists,
  currentTrackId,
  searchQuery = '',
  onPlayTrack,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onDeletePlaylist,
  onCreatePlaylist,
  onOpenInfoModal,
}: TrelloBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
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

  const userPlaylists = playlists
    .map((p) => p.name)
    .filter((name) => !name.includes('Todas las canciones'));

  const isTrackInPlaylistName = (targetPlaylistName: string, trackId: string): boolean => {
    const targetPl = playlists.find((p) => p.name === targetPlaylistName);
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

  const handleDragStart = (e: React.DragEvent, track: Track, sourcePlaylistName: string) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ trackId: track.id, sourcePlaylist: sourcePlaylistName })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent, playlistName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverColumn !== playlistName) {
      setDragOverColumn(playlistName);
    }
  };

  const handleDragLeave = (e: React.DragEvent, playlistName: string) => {
    e.preventDefault();
    if (dragOverColumn === playlistName) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetPlaylistName: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    try {
      const { trackId } = JSON.parse(rawData);
      if (trackId && onAddTrackToPlaylist) {
        onAddTrackToPlaylist(targetPlaylistName, trackId);
      }
    } catch {
      // Ignorar datos de arrastre inválidos
    }
  };

  if (playlists.length === 0) {
    return (
      <div className="trello-board trello-board--empty">
        <p className="trello-board__empty-message">No hay playlists disponibles.</p>
      </div>
    );
  }

  return (
    <div className="trello-board">
      <div className="trello-board__header">
        <h2 className="trello-board__title">
          <span>📊 Tablero de Playlists</span>
        </h2>
      </div>

      <div className="trello-board__columns">
        {playlists.map((playlist) => {
          const visibleTracks = filterTracks(playlist.tracks, searchQuery);
          const isMaster = playlist.name.includes('Todas las canciones');
          const isDragTarget = dragOverColumn === playlist.name;

          return (
            <div
              key={playlist.name}
              className={`trello-column ${isDragTarget ? 'trello-column--drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, playlist.name)}
              onDragLeave={(e) => handleDragLeave(e, playlist.name)}
              onDrop={(e) => handleDrop(e, playlist.name)}
              data-testid={`column-${playlist.name}`}
            >
              <div className="trello-column__header">
                <div className="trello-column__title-wrapper">
                  <span className="trello-column__icon">
                    {isMaster ? '🎵' : '📁'}
                  </span>
                  <h3 className="trello-column__title" title={playlist.name}>
                    {playlist.name}
                  </h3>
                  <span className="trello-column__badge">{visibleTracks.length}</span>
                </div>

                <div className="trello-column__actions">
                  {visibleTracks.length > 0 && (
                    <button
                      type="button"
                      className="trello-column__btn trello-column__btn--play"
                      title="Reproducir playlist completa"
                      onClick={() => onPlayTrack(visibleTracks[0], visibleTracks, 0)}
                    >
                      ▶
                    </button>
                  )}
                  {!isMaster && onDeletePlaylist && (
                    <button
                      type="button"
                      className="trello-column__btn"
                      title="Eliminar playlist"
                      onClick={() => {
                        if (confirm(`¿Eliminar la playlist "${playlist.name}"?`)) {
                          onDeletePlaylist(playlist.name);
                        }
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <div className="trello-column__cards">
                {visibleTracks.length === 0 ? (
                  <div className="trello-column__empty">
                    {searchQuery ? 'Sin coincidencia' : 'Esta playlist no tiene pistas.'}
                  </div>
                ) : (
                  visibleTracks.map((track, index) => {
                    const isPlaying = track.id === currentTrackId;
                    const isMenuOpen = activeMenuTrackId === `${playlist.name}-${track.id}`;

                    return (
                      <div
                        key={`${playlist.name}-${track.id}`}
                        className={`track-card ${isPlaying ? 'track-card--playing' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, track, playlist.name)}
                        onClick={() => onPlayTrack(track, visibleTracks, index)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Reproducir ${track.title}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onPlayTrack(track, visibleTracks, index);
                          }
                        }}
                      >
                        <div className="track-card__icon">
                          {isPlaying ? '🔊' : '🎶'}
                        </div>

                        <div className="track-card__details">
                          <span className="track-card__title" title={track.title}>
                            {truncateText(track.title)}
                          </span>
                          <span className="track-card__artist" title={track.artist}>
                            {truncateText(track.artist)}
                          </span>
                          <div className="track-card__footer">
                            <span className="track-card__duration">
                              {formatDuration(track.durationSeconds)}
                            </span>
                          </div>
                        </div>

                        <div className="track-card__actions-group">
                          {onOpenInfoModal && (
                            <button
                              type="button"
                              className="track-card__info-btn"
                              title="Información Trello"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenInfoModal(track);
                              }}
                            >
                              ℹ️
                            </button>
                          )}
                          <button
                            type="button"
                            className="track-card__menu-btn"
                            title="Opciones"
                            onClick={(e) => {
                              e.stopPropagation();
                              const menuKey = `${playlist.name}-${track.id}`;
                              setActiveMenuTrackId(isMenuOpen ? null : menuKey);
                            }}
                          >
                            ⋮
                          </button>
                        </div>

                        {isMenuOpen && (
                          <div
                            className="track-card__dropdown"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <div className="track-card__dropdown-header">
                              Añadir a playlist:
                            </div>
                            {userPlaylists.length === 0 ? (
                              <div className="track-card__dropdown-item" style={{ color: 'var(--color-text-secondary)' }}>
                                No hay playlists creadas
                              </div>
                            ) : (
                              userPlaylists.map((targetPlaylist) => {
                                const included = isTrackInPlaylistName(targetPlaylist, track.id);
                                return (
                                  <button
                                    key={targetPlaylist}
                                    type="button"
                                    className={`track-card__dropdown-item ${
                                      included ? 'track-card__dropdown-item--included' : ''
                                    }`}
                                    onClick={() => {
                                      if (included) {
                                        if (onRemoveTrackFromPlaylist) {
                                          onRemoveTrackFromPlaylist(targetPlaylist, track.id);
                                        }
                                      } else {
                                        if (onAddTrackToPlaylist) {
                                          onAddTrackToPlaylist(targetPlaylist, track.id);
                                        }
                                      }
                                      setActiveMenuTrackId(null);
                                    }}
                                  >
                                    {included ? `✓ ${targetPlaylist}` : targetPlaylist}
                                  </button>
                                );
                              })
                            )}

                            <hr className="track-card__dropdown-divider" />

                            {creatingForTrackId === track.id ? (
                              <form
                                className="track-card__new-form"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  void handleCreateAndAdd(track.id);
                                }}
                              >
                                <input
                                  type="text"
                                  className="track-card__new-input"
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
                                  className="track-card__new-btn"
                                  disabled={!newPlaylistName.trim()}
                                >
                                  Guardar
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                className="track-card__dropdown-item track-card__dropdown-item--add-new"
                                onClick={() => setCreatingForTrackId(track.id)}
                              >
                                ➕ Crear nueva playlist...
                              </button>
                            )}

                            {!isMaster && onRemoveTrackFromPlaylist && (
                              <>
                                <hr className="track-card__dropdown-divider" />
                                <button
                                  type="button"
                                  className="track-card__dropdown-item track-card__dropdown-item--danger"
                                  onClick={() => {
                                    onRemoveTrackFromPlaylist(playlist.name, track.id);
                                    setActiveMenuTrackId(null);
                                  }}
                                >
                                  Quitar de esta playlist
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TrelloBoard;
