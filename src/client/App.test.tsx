import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import App from './App';
import type { PlaylistsResponse, Track } from '@shared/types';

/**
 * jsdom does not implement media playback. The App mounts a single audio
 * engine (via PlayerBar), so stub the methods it touches to keep rendering and
 * PLAY_TRACK-driven playback from throwing.
 *
 * Re-applied before every test because the loading-state suite runs
 * `vi.restoreAllMocks()` in its teardown, which would otherwise reset the
 * `play` stub's resolved-promise implementation.
 */
beforeEach(() => {
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  });
});

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'Rock/song.mp3',
    fileName: 'song.mp3',
    title: 'Song',
    artist: 'Artist',
    album: '',
    durationSeconds: 120,
    playlist: 'Rock',
    streamUrl: '/api/stream/Rock/song.mp3',
    ...overrides,
  };
}

function mockFetch(body: PlaylistsResponse): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    } as unknown as Response),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App layout', () => {
  beforeEach(() => {
    mockFetch({ success: true, data: [], error: undefined });
  });

  it('renders the three layout regions: sidebar, main view, player bar', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.app__sidebar')).not.toBeNull();
    });
    expect(screen.getByLabelText('Vista principal')).toBeInTheDocument();
    expect(screen.getByLabelText('Barra de reproducción')).toBeInTheDocument();
  });

  it('wraps the regions in a single app container', async () => {
    const { container } = render(<App />);
    const root = container.querySelector('.app');

    expect(root).not.toBeNull();
    expect(root?.querySelector('.app__sidebar')).not.toBeNull();
    expect(root?.querySelector('.app__main')).not.toBeNull();
    expect(root?.querySelector('.app__player')).not.toBeNull();
  });
});

describe('App data loading (task 12.1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads playlists on mount and renders them in the sidebar (Req 1.1, 4.2)', async () => {
    mockFetch({
      success: true,
      data: [
        { name: 'Rock', trackCount: 1, tracks: [makeTrack()] },
        { name: 'Jazz', trackCount: 0, tracks: [] },
      ],
    });

    render(<App />);

    expect((await screen.findAllByText('Rock'))[0]).toBeInTheDocument();
    expect(screen.getAllByText('Jazz')[0]).toBeInTheDocument();
    // First playlist selected by default → its track shows in the main view.
    expect(await screen.findByText('Song')).toBeInTheDocument();
  });

  it('shows a user-facing error when the scan fails (Req 1.3)', async () => {
    mockFetch({
      success: false,
      data: [],
      error: "Carpeta 'musica' no encontrada",
    });

    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Carpeta 'musica' no encontrada");
  });

  it('shows a user-facing error on a network failure (Req 1.3)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(<App />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('App playback flow (task 12.2)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const rockTrack = makeTrack({
    id: 'Rock/song.mp3',
    fileName: 'song.mp3',
    title: 'Rock Anthem',
    artist: 'Rockers',
    playlist: 'Rock',
    streamUrl: '/api/stream/Rock/song.mp3',
  });
  const jazzTrack = makeTrack({
    id: 'Jazz/smooth.mp3',
    fileName: 'smooth.mp3',
    title: 'Smooth Jazz',
    artist: 'Jazzers',
    playlist: 'Jazz',
    streamUrl: '/api/stream/Jazz/smooth.mp3',
  });

  function mockTwoPlaylists(): void {
    mockFetch({
      success: true,
      data: [
        { name: 'Rock', trackCount: 1, tracks: [rockTrack] },
        { name: 'Jazz', trackCount: 1, tracks: [jazzTrack] },
      ],
    });
  }

  it('plays a track on click: PLAY_TRACK is dispatched and the player bar shows it (Req 2.1, 4.3)', async () => {
    mockTwoPlaylists();
    const { container } = render(<App />);

    // Rock is selected by default → click its track to play it.
    const trackCell = await screen.findByText('Rock Anthem');
    fireEvent.click(trackCell);

    // The player bar reflects the now-playing track (drives useAudioEngine's
    // streamUrl → audio playback).
    const title = container.querySelector('.player-bar__title');
    await waitFor(() => {
      expect(title).toHaveTextContent('Rock Anthem');
    });

    // The playing track is highlighted in the main view (currentTrackId).
    const playingRow = container.querySelector('.track-card--playing');
    expect(playingRow).not.toBeNull();
    expect(playingRow).toHaveTextContent('Rock Anthem');
  });

  it('switching playlist while playing updates the view but does NOT interrupt playback (Req 4.5)', async () => {
    mockTwoPlaylists();
    const { container } = render(<App />);

    // Start playing the Rock track.
    fireEvent.click(await screen.findByText('Rock Anthem'));
    await waitFor(() => {
      expect(container.querySelector('.player-bar__title')).toHaveTextContent('Rock Anthem');
    });

    // Switch to the Jazz playlist in the sidebar.
    const jazzBtns = screen.getAllByRole('button', { name: /Jazz/ });
    fireEvent.click(jazzBtns[0]);

    // Main view now shows Jazz's tracks; the Rock track is no longer listed in
    // the playlist view (it may still appear in the player bar below).
    expect(await screen.findByText('Smooth Jazz')).toBeInTheDocument();
    const mainView = screen.getByLabelText('Vista principal');

    // …but the player bar still shows the Rock track: playback was not
    // interrupted by browsing a different playlist.
    expect(container.querySelector('.player-bar__title')).toHaveTextContent('Rock Anthem');
  });
});

describe('App error states and edge cases (task 12.3)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a "no tracks" indication when the selected playlist is empty (Req 1.4)', async () => {
    mockFetch({
      success: true,
      data: [{ name: 'Vacía', trackCount: 0, tracks: [] }],
    });

    render(<App />);

    // Sidebar shows the empty playlist with a 0-track count…
    const emptyElements = await screen.findAllByText('Vacía');
    expect(emptyElements[0]).toBeInTheDocument();
    expect(screen.getByText(/0 pistas/)).toBeInTheDocument();
    // …and the main view indicates the playlist has no tracks.
    expect(await screen.findByText(/no tiene pistas/i)).toBeInTheDocument();
  });

  it('shows "No se encontraron pistas" only when a query yields no matches (Req 7.5)', async () => {
    mockFetch({
      success: true,
      data: [{ name: 'Rock', trackCount: 1, tracks: [makeTrack({ title: 'Rock Anthem' })] }],
    });

    render(<App />);

    // With an empty query, all tracks show and the message is absent.
    expect(await screen.findByText('Rock Anthem')).toBeInTheDocument();
    expect(screen.queryByText('No se encontraron pistas')).not.toBeInTheDocument();

    // Typing a non-matching query surfaces the empty-results message.
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz-nomatch' } });
    expect(await screen.findByText('No se encontraron pistas')).toBeInTheDocument();

    // Clearing the query hides the message again.
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    await waitFor(() => {
      expect(screen.queryByText('No se encontraron pistas')).not.toBeInTheDocument();
    });
  });

  it('shows an error notification naming the failed track and auto-skips to next (Req 2.7)', async () => {
    // Capture the HTMLAudioElement that useAudioEngine creates via `new Audio()`
    // (it is not attached to the DOM, so we intercept it at construction time).
    const created: HTMLAudioElement[] = [];
    const RealAudio = window.Audio;
    vi.stubGlobal(
      'Audio',
      class extends RealAudio {
        constructor(src?: string) {
          super(src);
          created.push(this as unknown as HTMLAudioElement);
        }
      },
    );

    const trackA = makeTrack({
      id: 'Rock/a.mp3',
      fileName: 'a.mp3',
      title: 'Broken Song',
      playlist: 'Rock',
      streamUrl: '/api/stream/Rock/a.mp3',
    });
    const trackB = makeTrack({
      id: 'Rock/b.mp3',
      fileName: 'b.mp3',
      title: 'Working Song',
      playlist: 'Rock',
      streamUrl: '/api/stream/Rock/b.mp3',
    });
    mockFetch({
      success: true,
      data: [{ name: 'Rock', trackCount: 2, tracks: [trackA, trackB] }],
    });

    const { container } = render(<App />);

    // Start playing the first (alphabetically "Broken Song") track.
    fireEvent.click(await screen.findByText('Broken Song'));
    await waitFor(() => {
      expect(container.querySelector('.player-bar__title')).toHaveTextContent('Broken Song');
    });

    // Simulate the audio element failing to play the current track.
    expect(created.length).toBeGreaterThan(0);
    const audio = created[0];
    fireEvent.error(audio);

    // A transient notification is shown naming the failed track (Req 2.7)…
    const notification = await screen.findByRole('alert');
    expect(notification).toHaveTextContent('Broken Song');

    // …and playback auto-skips to the next track in the queue.
    await waitFor(() => {
      expect(container.querySelector('.player-bar__title')).toHaveTextContent('Working Song');
    });
  });
});
