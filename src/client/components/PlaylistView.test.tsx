import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Track } from '@shared/types';
import PlaylistView, { sortTracksAlphabetically } from './PlaylistView';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: overrides.id ?? 'id-1',
    fileName: overrides.fileName ?? 'song.mp3',
    title: overrides.title ?? 'Song',
    artist: overrides.artist ?? 'Artist',
    album: overrides.album ?? '',
    durationSeconds: overrides.durationSeconds ?? 200,
    playlist: overrides.playlist ?? 'Rock',
    streamUrl: overrides.streamUrl ?? '/api/stream/Rock/song.mp3',
  };
}

describe('PlaylistView', () => {
  it('renders title, artist and formatted duration for each track', () => {
    const tracks = [
      makeTrack({ id: '1', title: 'Alpha', artist: 'Ann', durationSeconds: 65 }),
      makeTrack({ id: '2', title: 'Beta', artist: 'Bob', durationSeconds: 3661 }),
    ];

    render(<PlaylistView tracks={tracks} currentTrackId={null} onPlayTrack={vi.fn()} />);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByText('01:01:01')).toBeInTheDocument();
  });

  it('truncates title/artist longer than 50 characters with "…"', () => {
    const longTitle = 'x'.repeat(60);
    const tracks = [makeTrack({ id: '1', title: longTitle, artist: 'Artist' })];

    render(<PlaylistView tracks={tracks} currentTrackId={null} onPlayTrack={vi.fn()} />);

    const expected = 'x'.repeat(50) + '…';
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('highlights the currently playing track', () => {
    const tracks = [
      makeTrack({ id: '1', title: 'Alpha' }),
      makeTrack({ id: '2', title: 'Beta' }),
    ];

    render(<PlaylistView tracks={tracks} currentTrackId="2" onPlayTrack={vi.fn()} />);

    const playingCell = screen.getByText('Beta').closest('tr');
    expect(playingCell).toHaveClass('playlist-view__row--playing');
    expect(playingCell).toHaveAttribute('aria-current', 'true');
  });

  it('builds an alphabetically-sorted queue and correct index on click (Req 4.3)', () => {
    // Displayed order is intentionally not alphabetical.
    const tracks = [
      makeTrack({ id: '3', title: 'Charlie' }),
      makeTrack({ id: '1', title: 'alpha' }),
      makeTrack({ id: '2', title: 'Bravo' }),
    ];
    const onPlayTrack = vi.fn();

    render(<PlaylistView tracks={tracks} currentTrackId={null} onPlayTrack={onPlayTrack} />);

    fireEvent.click(screen.getByText('Charlie'));

    expect(onPlayTrack).toHaveBeenCalledTimes(1);
    const [clickedTrack, queue, index] = onPlayTrack.mock.calls[0];
    expect(clickedTrack.id).toBe('3');
    expect(queue.map((t: Track) => t.id)).toEqual(['1', '2', '3']);
    expect(index).toBe(2);
    expect(queue[index].id).toBe('3');
  });

  it('shows an empty message when there are no tracks', () => {
    render(<PlaylistView tracks={[]} currentTrackId={null} onPlayTrack={vi.fn()} />);
    expect(screen.getByText('Esta playlist no tiene pistas.')).toBeInTheDocument();
  });
});

describe('sortTracksAlphabetically', () => {
  it('sorts by title case-insensitively without mutating input', () => {
    const tracks = [
      makeTrack({ id: '1', title: 'banana' }),
      makeTrack({ id: '2', title: 'Apple' }),
      makeTrack({ id: '3', title: 'cherry' }),
    ];
    const original = [...tracks];

    const sorted = sortTracksAlphabetically(tracks);

    expect(sorted.map((t) => t.title)).toEqual(['Apple', 'banana', 'cherry']);
    // Input array is not mutated.
    expect(tracks).toEqual(original);
  });
});
