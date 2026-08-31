import type { PlaylistsResponse } from '@shared/types';

/**
 * API client service for SpotiMP4.
 *
 * Wraps the backend REST endpoints consumed by the frontend. Currently exposes
 * a single call to load the playlists produced by the "musica" folder scan.
 *
 * Requirements:
 *   - 1.1 Load the playlists so they can be listed in the sidebar.
 *   - 1.3 Surface a user-facing error when the "musica" folder is missing or
 *         the API is unavailable.
 *   - 4.2 Provide the playlist/track data rendered in the main view.
 *   - 4.5 Provide the data the UI needs to switch playlists.
 */

/** Endpoint that returns all playlists with their tracks and metadata. */
const PLAYLISTS_ENDPOINT = '/api/playlists';

/** Message shown when the backend cannot be reached (network/parse failure). */
export const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con el servidor de música. Verifica que el servidor esté en ejecución e inténtalo de nuevo.';

/**
 * Fetch the playlists from the backend.
 *
 * On success this resolves with the parsed {@link PlaylistsResponse}. Note that
 * a `success: false` payload (for example, the "musica" folder was not found)
 * is a *valid* response and is returned as-is so the UI can display the
 * backend-provided error message (Req 1.3).
 *
 * Network-level failures (server unreachable, non-OK HTTP status, or an
 * unparseable body) are normalized into a `PlaylistsResponse` with
 * `success: false`, an empty `data` array and a user-facing `error` message,
 * so callers can render errors uniformly without a try/catch.
 */
export async function fetchPlaylists(): Promise<PlaylistsResponse> {
  let response: Response;

  try {
    response = await fetch(PLAYLISTS_ENDPOINT, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    // The server is unreachable / a network error occurred.
    return { success: false, data: [], error: NETWORK_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return {
      success: false,
      data: [],
      error: `El servidor respondió con un error (HTTP ${response.status}).`,
    };
  }

  try {
    const body = (await response.json()) as PlaylistsResponse;
    return normalizePlaylistsResponse(body);
  } catch {
    // The body was not valid JSON / did not match the expected shape.
    return { success: false, data: [], error: NETWORK_ERROR_MESSAGE };
  }
}

/**
 * Defensively normalize a parsed response body into a well-formed
 * {@link PlaylistsResponse}, guarding against unexpected shapes.
 */
function normalizePlaylistsResponse(body: PlaylistsResponse): PlaylistsResponse {
  if (body === null || typeof body !== 'object' || typeof body.success !== 'boolean') {
    return { success: false, data: [], error: NETWORK_ERROR_MESSAGE };
  }

  return {
    success: body.success,
    data: Array.isArray(body.data) ? body.data : [],
    error: body.error,
  };
}

/** Endpoint for starting background downloads. */
const DOWNLOAD_ENDPOINT = '/api/download';

export async function requestDownload(
  query: string,
  playlist?: string,
  format: 'mp3' | 'mp4' = 'mp3',
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(DOWNLOAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, playlist, format }),
    });

    const data = await res.json();
    return data;
  } catch {
    return { success: false, error: NETWORK_ERROR_MESSAGE };
  }
}

export async function fetchDownloadStatus(): Promise<{ success: boolean; jobs?: any[] }> {
  try {
    const res = await fetch(`${DOWNLOAD_ENDPOINT}/status`);
    const data = await res.json();
    return data;
  } catch {
    return { success: false };
  }
}

/** Endpoint for virtual playlist operations. */
const VIRTUAL_PLAYLISTS_ENDPOINT = '/api/virtual-playlists';

export async function createPlaylistApi(name: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(VIRTUAL_PLAYLISTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return await res.json();
  } catch {
    return { success: false, error: NETWORK_ERROR_MESSAGE };
  }
}

export async function deletePlaylistApi(name: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${VIRTUAL_PLAYLISTS_ENDPOINT}/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch {
    return { success: false, error: NETWORK_ERROR_MESSAGE };
  }
}

export async function addTrackToPlaylistApi(
  playlistName: string,
  trackId: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${VIRTUAL_PLAYLISTS_ENDPOINT}/${encodeURIComponent(playlistName)}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: NETWORK_ERROR_MESSAGE };
  }
}

export async function removeTrackFromPlaylistApi(
  playlistName: string,
  trackId: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(
      `${VIRTUAL_PLAYLISTS_ENDPOINT}/${encodeURIComponent(playlistName)}/tracks/${encodeURIComponent(trackId)}`,
      {
        method: 'DELETE',
      },
    );
    return await res.json();
  } catch {
    return { success: false, error: NETWORK_ERROR_MESSAGE };
  }
}


