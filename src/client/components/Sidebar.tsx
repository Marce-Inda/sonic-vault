import { useState } from 'react';
import './Sidebar.css';
import type { Playlist } from '@shared/types';

export interface SidebarProps {
  playlists: Playlist[];
  selectedPlaylist: string | null;
  onSelectPlaylist: (name: string) => void;
  onCreatePlaylist?: (name: string) => void;
  onDeletePlaylist?: (name: string) => void;
}

function Sidebar({
  playlists,
  selectedPlaylist,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim() && onCreatePlaylist) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  return (
    <nav className="sidebar" aria-label="Playlists">
      <div className="sidebar__brand">
        <span className="sidebar__brand-icon">⚡</span>
        <h1 className="sidebar__brand-title">SonicVault</h1>
      </div>

      <div className="sidebar__header">
        <h2 className="sidebar__title">Playlists</h2>

        {onCreatePlaylist && (
          <button
            type="button"
            className="sidebar__add-btn"
            title="Crear nueva playlist"
            onClick={() => setIsCreating(!isCreating)}
          >
            + Crear
          </button>
        )}
      </div>

      {isCreating && (
        <form className="sidebar__create-form" onSubmit={handleCreateSubmit}>
          <input
            type="text"
            className="sidebar__create-input"
            placeholder="Nombre de la playlist..."
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            autoFocus
          />
          <div className="sidebar__create-actions">
            <button type="submit" className="sidebar__create-btn">
              Guardar
            </button>
            <button
              type="button"
              className="sidebar__cancel-btn"
              onClick={() => setIsCreating(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <ul className="sidebar__list" role="list">
        {playlists.map((playlist) => {
          const isSelected = playlist.name === selectedPlaylist;
          const isMaster = playlist.name.includes('Todas las canciones');
          return (
            <li key={playlist.name} className="sidebar__item">
              <div className="sidebar__item-row">
                <button
                  type="button"
                  className={
                    isSelected
                      ? 'sidebar__button sidebar__button--active'
                      : 'sidebar__button'
                  }
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => onSelectPlaylist(playlist.name)}
                >
                  <span className="sidebar__name">{playlist.name}</span>
                  <span className="sidebar__count">
                    {playlist.trackCount} {playlist.trackCount === 1 ? 'pista' : 'pistas'}
                  </span>
                </button>
                {!isMaster && onDeletePlaylist && (
                  <button
                    type="button"
                    className="sidebar__delete-btn"
                    title={`Eliminar playlist ${playlist.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar la playlist "${playlist.name}"?`)) {
                        onDeletePlaylist(playlist.name);
                      }
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Sidebar;
