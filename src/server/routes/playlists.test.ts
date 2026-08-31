/**
 * Unit tests for the `GET /api/playlists` route and its assembly logic.
 *
 * These tests exercise `getPlaylists` against real temporary directories
 * (no mocks of the filesystem) and drive the metadata parser through the
 * real files, validating the behavior in Requirements 1.1–1.4, 6.1, 6.2:
 * - full Track assembly (id, metadata, streamUrl)
 * - trackCount reflects indexed audio files
 * - empty playlists are returned with 0 tracks
 * - missing "musica" folder yields a failed response with an error message
 * - the router responds over HTTP with a PlaylistsResponse
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';

import { getPlaylists, buildStreamUrl, buildTrackId, playlistsRouter } from './playlists';
import { getVirtualPlaylists } from '../services/virtualPlaylistStore';
import type { TrackMetadata } from '@shared/types';

let tmpRoot: string;

async function touch(filePath: string): Promise<void> {
  await fs.writeFile(filePath, '');
}

/** Deterministic metadata stub so track assembly can be asserted precisely. */
async function fakeParseMetadata(filePath: string): Promise<TrackMetadata> {
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
  return {
    title: `title:${fileName}`,
    artist: 'Artista desconocido',
    album: '',
    durationSeconds: 123,
  };
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spotimp4-playlists-'));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('buildStreamUrl', () => {
  it('builds an /api/stream URL with encoded segments', () => {
    expect(buildStreamUrl('Rock Clásico', 'a b.mp3')).toBe(
      '/api/stream/Rock%20Cl%C3%A1sico/a%20b.mp3',
    );
  });
});

describe('buildTrackId', () => {
  it('combines playlist and file name', () => {
    expect(buildTrackId('rock', 'song.mp3')).toBe('rock/song.mp3');
  });
});

describe('getPlaylists', () => {
  it('assembles full Track objects with metadata and stream URLs', async () => {
    const rock = path.join(tmpRoot, 'rock');
    await fs.mkdir(rock);
    await touch(path.join(rock, 'song.mp3'));

    const response = await getPlaylists(tmpRoot, { parseMetadata: fakeParseMetadata });

    expect(response.success).toBe(true);
    expect(response.error).toBeUndefined();

    const playlist = response.data.find((p) => p.name === 'rock');
    expect(playlist).toBeDefined();
    expect(playlist!.name).toBe('rock');
    expect(playlist!.trackCount).toBe(1);

    const track = playlist!.tracks[0];
    expect(track).toEqual({
      id: 'rock/song.mp3',
      fileName: 'song.mp3',
      title: 'title:song.mp3',
      artist: 'Artista desconocido',
      album: '',
      durationSeconds: 123,
      playlist: 'rock',
      streamUrl: '/api/stream/rock/song.mp3',
    });
  });

  it('returns playlists sorted alphabetically with only audio files indexed', async () => {
    const zeta = path.join(tmpRoot, 'Zeta');
    const alpha = path.join(tmpRoot, 'alpha');
    await fs.mkdir(zeta);
    await fs.mkdir(alpha);
    await touch(path.join(alpha, 'a.mp3'));
    await touch(path.join(alpha, 'b.mp4'));
    await touch(path.join(alpha, 'notes.txt'));
    await touch(path.join(zeta, 'z.mp3'));

    const response = await getPlaylists(tmpRoot, { parseMetadata: fakeParseMetadata });

    expect(response.success).toBe(true);
    const virtualNames = new Set(getVirtualPlaylists().map((v) => v.name));
    const folderPlaylists = response.data.filter(
      (p) => !p.name.includes('Todas las canciones') && !virtualNames.has(p.name),
    );
    expect(folderPlaylists.map((p) => p.name)).toEqual(['alpha', 'Zeta']);
    expect(folderPlaylists[0].trackCount).toBe(2);
    expect(folderPlaylists[1].trackCount).toBe(1);
  });

  it('returns empty playlists with a trackCount of 0', async () => {
    await fs.mkdir(path.join(tmpRoot, 'empty'));

    const response = await getPlaylists(tmpRoot, { parseMetadata: fakeParseMetadata });

    expect(response.success).toBe(true);
    const virtualNames = new Set(getVirtualPlaylists().map((v) => v.name));
    const folderPlaylists = response.data.filter(
      (p) => !p.name.includes('Todas las canciones') && !virtualNames.has(p.name),
    );
    expect(folderPlaylists).toEqual([
      { name: 'empty', trackCount: 0, tracks: [] },
    ]);
  });


  it('reports failure when the "musica" folder is missing', async () => {
    const missing = path.join(tmpRoot, 'does-not-exist');

    const response = await getPlaylists(missing, { parseMetadata: fakeParseMetadata });

    expect(response.success).toBe(false);
    expect(response.data).toEqual([]);
    expect(typeof response.error).toBe('string');
    expect(response.error && response.error.length).toBeGreaterThan(0);
  });
});

describe('GET /api/playlists (router)', () => {
  it('responds with a PlaylistsResponse JSON body', async () => {
    const originalMusicDir = process.env.MUSIC_DIR;
    process.env.MUSIC_DIR = tmpRoot;

    const app = express();
    app.use('/api/playlists', playlistsRouter);

    const res = await request(app).get('/api/playlists');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);

    process.env.MUSIC_DIR = originalMusicDir;
  }, 15000);
});


