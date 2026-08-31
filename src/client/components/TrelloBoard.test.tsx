import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TrelloBoard from './TrelloBoard';
import type { Playlist, Track } from '@shared/types';

const mockTracks: Track[] = [
  {
    id: 'track-1',
    fileName: 'song1.mp3',
    title: 'Canción 1',
    artist: 'Artista 1',
    album: 'Álbum 1',
    durationSeconds: 180,
    playlist: '🎵 Todas las canciones',
    streamUrl: '/api/stream/todas/song1.mp3',
  },
  {
    id: 'track-2',
    fileName: 'song2.mp3',
    title: 'Canción 2',
    artist: 'Artista 2',
    album: 'Álbum 2',
    durationSeconds: 210,
    playlist: 'Favoritas',
    streamUrl: '/api/stream/favoritas/song2.mp3',
  },
];

const mockPlaylists: Playlist[] = [
  {
    name: '🎵 Todas las canciones',
    trackCount: 2,
    tracks: mockTracks,
  },
  {
    name: 'Favoritas',
    trackCount: 1,
    tracks: [mockTracks[1]],
  },
];

describe('TrelloBoard Component', () => {
  it('renders columns for each playlist', () => {
    render(
      <TrelloBoard
        playlists={mockPlaylists}
        currentTrackId={null}
        onPlayTrack={vi.fn()}
      />
    );

    expect(screen.getByText('🎵 Todas las canciones')).toBeInTheDocument();
    expect(screen.getByText('Favoritas')).toBeInTheDocument();
  });

  it('renders track cards with titles and artists', () => {
    render(
      <TrelloBoard
        playlists={mockPlaylists}
        currentTrackId={null}
        onPlayTrack={vi.fn()}
      />
    );

    expect(screen.getAllByText('Canción 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Canción 2').length).toBeGreaterThan(0);
  });

  it('calls onPlayTrack when clicking a track card', () => {
    const handlePlayTrack = vi.fn();
    render(
      <TrelloBoard
        playlists={mockPlaylists}
        currentTrackId={null}
        onPlayTrack={handlePlayTrack}
      />
    );

    const card = screen.getAllByText('Canción 1')[0].closest('.track-card');
    expect(card).not.toBeNull();
    if (card) {
      fireEvent.click(card);
      expect(handlePlayTrack).toHaveBeenCalledWith(
        mockTracks[0],
        mockTracks,
        0
      );
    }
  });

  it('highlights currently playing track card', () => {
    render(
      <TrelloBoard
        playlists={mockPlaylists}
        currentTrackId="track-1"
        onPlayTrack={vi.fn()}
      />
    );

    const card = screen.getAllByText('Canción 1')[0].closest('.track-card');
    expect(card).toHaveClass('track-card--playing');
  });

  it('supports drag and drop between columns', () => {
    const handleAddTrackToPlaylist = vi.fn();
    render(
      <TrelloBoard
        playlists={mockPlaylists}
        currentTrackId={null}
        onPlayTrack={vi.fn()}
        onAddTrackToPlaylist={handleAddTrackToPlaylist}
      />
    );

    const columnTarget = screen.getByTestId('column-Favoritas');
    const dragData = JSON.stringify({ trackId: 'track-1', sourcePlaylist: '🎵 Todas las canciones' });

    fireEvent.drop(columnTarget, {
      dataTransfer: {
        getData: () => dragData,
      },
    });

    expect(handleAddTrackToPlaylist).toHaveBeenCalledWith('Favoritas', 'track-1');
  });
});
