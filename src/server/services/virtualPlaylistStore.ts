import fs from 'node:fs';
import path from 'node:path';
import type { VirtualPlaylistDefinition } from '../../shared/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'virtualPlaylists.json');

let cachedPlaylists: VirtualPlaylistDefinition[] | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadFromFile(): VirtualPlaylistDefinition[] {
  ensureDataDir();
  if (!fs.existsSync(FILE_PATH)) {
    // Default initial playlists
    const initial: VirtualPlaylistDefinition[] = [
      {
        id: 'pl_favorites',
        name: '⭐ Mis Favoritos',
        trackIds: [],
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(FILE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error loading virtualPlaylists.json:', err);
  }
  return [];
}

function saveToFile(playlists: VirtualPlaylistDefinition[]): void {
  ensureDataDir();
  fs.writeFileSync(FILE_PATH, JSON.stringify(playlists, null, 2), 'utf-8');
}

export function getVirtualPlaylists(): VirtualPlaylistDefinition[] {
  if (!cachedPlaylists) {
    cachedPlaylists = loadFromFile();
  }
  return cachedPlaylists;
}

export function createVirtualPlaylist(name: string): VirtualPlaylistDefinition {
  const playlists = getVirtualPlaylists();
  const id = `pl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newPlaylist: VirtualPlaylistDefinition = {
    id,
    name: name.trim(),
    trackIds: [],
    createdAt: new Date().toISOString(),
  };
  playlists.push(newPlaylist);
  saveToFile(playlists);
  return newPlaylist;
}

export function deleteVirtualPlaylist(id: string): boolean {
  let playlists = getVirtualPlaylists();
  const originalLength = playlists.length;
  playlists = playlists.filter((p) => p.id !== id && p.name !== id);
  if (playlists.length !== originalLength) {
    cachedPlaylists = playlists;
    saveToFile(playlists);
    return true;
  }
  return false;
}

export function addTrackToPlaylist(playlistIdentifier: string, trackId: string): boolean {
  const playlists = getVirtualPlaylists();
  const playlist = playlists.find(
    (p) => p.id === playlistIdentifier || p.name === playlistIdentifier,
  );
  if (!playlist) return false;

  if (!playlist.trackIds.includes(trackId)) {
    playlist.trackIds.push(trackId);
    saveToFile(playlists);
  }
  return true;
}

export function removeTrackFromPlaylist(
  playlistIdentifier: string,
  trackId: string,
): boolean {
  const playlists = getVirtualPlaylists();
  const playlist = playlists.find(
    (p) => p.id === playlistIdentifier || p.name === playlistIdentifier,
  );
  if (!playlist) return false;

  const originalLength = playlist.trackIds.length;
  playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId);
  if (playlist.trackIds.length !== originalLength) {
    saveToFile(playlists);
    return true;
  }
  return false;
}
