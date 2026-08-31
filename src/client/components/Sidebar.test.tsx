import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Sidebar from './Sidebar';
import type { Playlist } from '@shared/types';

afterEach(cleanup);

function makePlaylist(name: string, trackCount: number): Playlist {
  return { name, trackCount, tracks: [] };
}

const playlists: Playlist[] = [
  makePlaylist('Rock', 3),
  makePlaylist('Jazz', 1),
  makePlaylist('Vacía', 0),
];

describe('Sidebar', () => {
  it('renders each playlist name and its track count (4.1, 4.4)', () => {
    render(
      <Sidebar playlists={playlists} selectedPlaylist={null} onSelectPlaylist={() => {}} />
    );

    expect(screen.getByText('Rock')).toBeInTheDocument();
    expect(screen.getByText('Jazz')).toBeInTheDocument();
    expect(screen.getByText('Vacía')).toBeInTheDocument();

    // Track counts, with singular/plural handling.
    expect(screen.getByText('3 pistas')).toBeInTheDocument();
    expect(screen.getByText('1 pista')).toBeInTheDocument();
    expect(screen.getByText('0 pistas')).toBeInTheDocument();
  });

  it('highlights only the currently selected playlist (4.2)', () => {
    render(
      <Sidebar playlists={playlists} selectedPlaylist="Jazz" onSelectPlaylist={() => {}} />
    );

    const selected = screen.getByRole('button', { name: /Jazz/ });
    expect(selected).toHaveClass('sidebar__button--active');
    expect(selected).toHaveAttribute('aria-current', 'true');

    const other = screen.getByRole('button', { name: /Rock/ });
    expect(other).not.toHaveClass('sidebar__button--active');
    expect(other).not.toHaveAttribute('aria-current');
  });

  it('does not highlight any playlist when none is selected', () => {
    render(
      <Sidebar playlists={playlists} selectedPlaylist={null} onSelectPlaylist={() => {}} />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).not.toHaveClass('sidebar__button--active');
    });
  });

  it('calls onSelectPlaylist with the playlist name when clicked (4.2)', () => {
    const onSelectPlaylist = vi.fn();
    render(
      <Sidebar
        playlists={playlists}
        selectedPlaylist={null}
        onSelectPlaylist={onSelectPlaylist}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Rock/ }));

    expect(onSelectPlaylist).toHaveBeenCalledTimes(1);
    expect(onSelectPlaylist).toHaveBeenCalledWith('Rock');
  });

  it('renders no playlist items when the list is empty', () => {
    render(<Sidebar playlists={[]} selectedPlaylist={null} onSelectPlaylist={() => {}} />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
