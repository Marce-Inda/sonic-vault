/**
 * Unit tests for the StreamController (`GET /api/stream/:playlist/:track`).
 *
 * These tests exercise the controller through a real Express app using
 * supertest (no mocks). Fixture audio files are written directly into the
 * resolved MUSIC_ROOT under a uniquely-named playlist folder and cleaned up
 * afterwards, so the tests validate the real file-serving behavior described
 * in Requirements 2.1 and 3.6:
 * - correct MIME types (audio/mpeg for .mp3, audio/mp4 for .mp4)
 * - HTTP Range Requests (206 Partial Content, Content-Range, Accept-Ranges)
 * - full-content responses (200)
 * - 404 when the file does not exist
 * - path-traversal protection
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import express, { type Express } from 'express';

import { streamTrack, MUSIC_ROOT } from './streamController';

const PLAYLIST = `__stream_test_${process.pid}`;
const PLAYLIST_DIR = path.join(MUSIC_ROOT, PLAYLIST);

// Deterministic file contents so we can assert byte ranges precisely.
const MP3_BYTES = Buffer.from('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'ascii');
const MP4_BYTES = Buffer.from('the quick brown fox jumps over the lazy dog', 'ascii');

function makeApp(): Express {
  const app = express();
  app.get('/api/stream/:playlist/:track', streamTrack);
  return app;
}

const app = makeApp();

beforeAll(async () => {
  await fs.mkdir(PLAYLIST_DIR, { recursive: true });
  await fs.writeFile(path.join(PLAYLIST_DIR, 'song.mp3'), MP3_BYTES);
  await fs.writeFile(path.join(PLAYLIST_DIR, 'clip.mp4'), MP4_BYTES);
});

afterAll(async () => {
  await fs.rm(PLAYLIST_DIR, { recursive: true, force: true });
});

describe('streamTrack', () => {
  it('serves an .mp3 file with audio/mpeg MIME type and 200 (Req 2.1)', async () => {
    const res = await request(app).get(`/api/stream/${PLAYLIST}/song.mp3`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('audio/mpeg');
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-length']).toBe(String(MP3_BYTES.length));
    expect(Buffer.from(res.body).equals(MP3_BYTES)).toBe(true);
  });

  it('serves an .mp4 file with audio/mp4 MIME type', async () => {
    const res = await request(app).get(`/api/stream/${PLAYLIST}/clip.mp4`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('audio/mp4');
    expect(Buffer.from(res.body).equals(MP4_BYTES)).toBe(true);
  });

  it('responds with 206 Partial Content and Content-Range for a Range request (Req 3.6)', async () => {
    const res = await request(app)
      .get(`/api/stream/${PLAYLIST}/song.mp3`)
      .set('Range', 'bytes=5-9');

    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 5-9/${MP3_BYTES.length}`);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-length']).toBe('5');
    expect(Buffer.from(res.body).equals(MP3_BYTES.subarray(5, 10))).toBe(true);
  });

  it('supports an open-ended range (start with no end)', async () => {
    const res = await request(app)
      .get(`/api/stream/${PLAYLIST}/song.mp3`)
      .set('Range', 'bytes=30-');

    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 30-${MP3_BYTES.length - 1}/${MP3_BYTES.length}`);
    expect(Buffer.from(res.body).equals(MP3_BYTES.subarray(30))).toBe(true);
  });

  it('supports a suffix range (last N bytes)', async () => {
    const res = await request(app)
      .get(`/api/stream/${PLAYLIST}/song.mp3`)
      .set('Range', 'bytes=-6');

    expect(res.status).toBe(206);
    const start = MP3_BYTES.length - 6;
    expect(res.headers['content-range']).toBe(`bytes ${start}-${MP3_BYTES.length - 1}/${MP3_BYTES.length}`);
    expect(Buffer.from(res.body).equals(MP3_BYTES.subarray(start))).toBe(true);
  });

  it('returns 416 for an unsatisfiable range', async () => {
    const res = await request(app)
      .get(`/api/stream/${PLAYLIST}/song.mp3`)
      .set('Range', `bytes=${MP3_BYTES.length + 10}-${MP3_BYTES.length + 20}`);

    expect(res.status).toBe(416);
    expect(res.headers['content-range']).toBe(`bytes */${MP3_BYTES.length}`);
  });

  it('returns 404 when the file does not exist', async () => {
    const res = await request(app).get(`/api/stream/${PLAYLIST}/missing.mp3`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 when the playlist folder does not exist', async () => {
    const res = await request(app).get('/api/stream/__no_such_playlist__/song.mp3');

    expect(res.status).toBe(404);
  });

  it('returns 404 for unsupported file extensions', async () => {
    const res = await request(app).get(`/api/stream/${PLAYLIST}/song.txt`);

    expect(res.status).toBe(404);
  });

  it('rejects path traversal attempts in the track param', async () => {
    // Encoded "../../etc/passwd" style traversal must be blocked.
    const res = await request(app).get(
      `/api/stream/${PLAYLIST}/${encodeURIComponent('../../secret.mp3')}`
    );

    expect(res.status).toBe(404);
  });

  it('rejects path traversal attempts in the playlist param', async () => {
    const res = await request(app).get(
      `/api/stream/${encodeURIComponent('..')}/song.mp3`
    );

    expect(res.status).toBe(404);
  });
});
