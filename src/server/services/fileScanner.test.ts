/**
 * Unit tests for the FileScanner service.
 *
 * These tests exercise `scanMusicFolder` against real temporary directories
 * (no mocks) to validate the behavior described in Requirements 1.1–1.6:
 * - nonexistent folder handling
 * - empty folder handling
 * - playlists without audio files (0 tracks)
 * - extension filtering (only .mp3/.mp4)
 * - ignoring audio files placed directly in the "musica" root
 * - excluding nested subdirectories inside a playlist folder
 * - alphabetical (case-insensitive) sorting of playlists
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { scanMusicFolder } from './fileScanner';

let tmpRoot: string;

/** Creates an empty file at the given path (parent directories must exist). */
async function touch(filePath: string): Promise<void> {
  await fs.writeFile(filePath, '');
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spotimp4-scan-'));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('scanMusicFolder', () => {
  it('returns a folder_not_found error for a nonexistent base folder', async () => {
    const missingPath = path.join(tmpRoot, 'does-not-exist');

    const result = await scanMusicFolder(missingPath);

    expect(result.playlists).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('folder_not_found');
    expect(result.errors[0].message).toMatch(/musica/i);
  });

  it('returns no playlists and no errors for an empty base folder', async () => {
    const result = await scanMusicFolder(tmpRoot);

    expect(result.playlists).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('includes playlists with no audio files as 0-track playlists (Req 1.4)', async () => {
    await fs.mkdir(path.join(tmpRoot, 'EmptyPlaylist'));
    // Put a non-audio file to make sure it is not counted.
    await touch(path.join(tmpRoot, 'EmptyPlaylist', 'notes.txt'));

    const result = await scanMusicFolder(tmpRoot);

    expect(result.errors).toEqual([]);
    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0].name).toBe('EmptyPlaylist');
    expect(result.playlists[0].tracks).toEqual([]);
  });

  it('indexes only .mp3 and .mp4 files, filtering out other extensions (Req 1.2)', async () => {
    const playlistDir = path.join(tmpRoot, 'Rock');
    await fs.mkdir(playlistDir);
    await touch(path.join(playlistDir, 'song.mp3'));
    await touch(path.join(playlistDir, 'video.mp4'));
    await touch(path.join(playlistDir, 'cover.jpg'));
    await touch(path.join(playlistDir, 'readme.txt'));
    await touch(path.join(playlistDir, 'lossless.flac'));
    await touch(path.join(playlistDir, 'audio.wav'));

    const result = await scanMusicFolder(tmpRoot);

    expect(result.playlists).toHaveLength(1);
    const fileNames = result.playlists[0].tracks.map((t) => t.fileName);
    expect(fileNames).toEqual(['song.mp3', 'video.mp4']);
  });

  it('matches extensions case-insensitively', async () => {
    const playlistDir = path.join(tmpRoot, 'Mixed');
    await fs.mkdir(playlistDir);
    await touch(path.join(playlistDir, 'UPPER.MP3'));
    await touch(path.join(playlistDir, 'Mixed.Mp4'));

    const result = await scanMusicFolder(tmpRoot);

    const tracks = result.playlists[0].tracks;
    const byName = Object.fromEntries(tracks.map((t) => [t.fileName, t]));
    expect(byName['UPPER.MP3'].extension).toBe('mp3');
    expect(byName['Mixed.Mp4'].extension).toBe('mp4');
  });

  it('ignores audio files placed directly in the base folder (Req 1.6)', async () => {
    // Audio files directly at the root should be ignored.
    await touch(path.join(tmpRoot, 'loose-song.mp3'));
    await touch(path.join(tmpRoot, 'loose-video.mp4'));

    // A real playlist with one audio file.
    const playlistDir = path.join(tmpRoot, 'Playlist');
    await fs.mkdir(playlistDir);
    await touch(path.join(playlistDir, 'inside.mp3'));

    const result = await scanMusicFolder(tmpRoot);

    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0].name).toBe('Playlist');
    expect(result.playlists[0].tracks.map((t) => t.fileName)).toEqual(['inside.mp3']);
  });

  it('excludes audio files inside nested subdirectories of a playlist (Req 1.2)', async () => {
    const playlistDir = path.join(tmpRoot, 'Jazz');
    await fs.mkdir(playlistDir);
    await touch(path.join(playlistDir, 'top-level.mp3'));

    // Nested subdirectory with audio files that must be excluded.
    const nestedDir = path.join(playlistDir, 'nested');
    await fs.mkdir(nestedDir);
    await touch(path.join(nestedDir, 'deep.mp3'));
    await touch(path.join(nestedDir, 'deep.mp4'));

    const result = await scanMusicFolder(tmpRoot);

    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0].tracks.map((t) => t.fileName)).toEqual(['top-level.mp3']);
  });

  it('returns playlists sorted alphabetically, case-insensitively (Req 1.1)', async () => {
    // Create folders in a non-alphabetical order and with mixed casing.
    for (const name of ['banana', 'Apple', 'cherry', 'apricot', 'Banana2']) {
      await fs.mkdir(path.join(tmpRoot, name));
    }

    const result = await scanMusicFolder(tmpRoot);

    const names = result.playlists.map((p) => p.name);
    expect(names).toEqual(['Apple', 'apricot', 'banana', 'Banana2', 'cherry']);
  });

  it('populates track metadata (fileName, filePath, extension) correctly', async () => {
    const playlistDir = path.join(tmpRoot, 'Pop');
    await fs.mkdir(playlistDir);
    const songPath = path.join(playlistDir, 'hit.mp3');
    await touch(songPath);

    const result = await scanMusicFolder(tmpRoot);

    const track = result.playlists[0].tracks[0];
    expect(track.fileName).toBe('hit.mp3');
    expect(track.filePath).toBe(songPath);
    expect(track.extension).toBe('mp3');
  });
});
