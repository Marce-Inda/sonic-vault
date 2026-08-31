import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchPlaylists, NETWORK_ERROR_MESSAGE } from './api';
import type { PlaylistsResponse } from '@shared/types';

function mockFetchResolve(body: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(body),
    } as unknown as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchPlaylists', () => {
  it('returns the parsed successful response', async () => {
    const payload: PlaylistsResponse = {
      success: true,
      data: [{ name: 'Rock', trackCount: 0, tracks: [] }],
    };
    mockFetchResolve(payload);

    const result = await fetchPlaylists();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Rock');
  });

  it('passes through a success:false response with its error message (Req 1.3)', async () => {
    const payload: PlaylistsResponse = {
      success: false,
      data: [],
      error: "Carpeta 'musica' no encontrada",
    };
    mockFetchResolve(payload);

    const result = await fetchPlaylists();

    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toBe("Carpeta 'musica' no encontrada");
  });

  it('normalizes a network error into a failed response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await fetchPlaylists();

    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('normalizes a non-OK HTTP status into a failed response', async () => {
    mockFetchResolve({}, false, 500);

    const result = await fetchPlaylists();

    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toContain('500');
  });

  it('normalizes an unparseable body into a failed response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      } as unknown as Response),
    );

    const result = await fetchPlaylists();

    expect(result.success).toBe(false);
    expect(result.error).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('guards against a malformed response shape', async () => {
    mockFetchResolve({ foo: 'bar' });

    const result = await fetchPlaylists();

    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toBe(NETWORK_ERROR_MESSAGE);
  });
});
