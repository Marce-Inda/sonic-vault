import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DownloadJob, DownloadRequest } from '../../shared/types.js';
import { MUSIC_FOLDER_PATH } from '../routes/playlists.js';

/** In-memory store for background download jobs. */
const activeJobs: Map<string, DownloadJob> = new Map();

/**
 * Locate the yt-dlp executable path.
 * Checks user local bin (~/.local/bin/yt-dlp) and system PATH.
 */
export function getYtDlpPath(): string {
  const userLocalBin = path.join(os.homedir(), '.local', 'bin', 'yt-dlp');
  if (fs.existsSync(userLocalBin)) {
    return userLocalBin;
  }
  return 'yt-dlp';
}

/**
 * Resolves a Spotify playlist or track URL into track titles for YouTube searching.
 */
export async function resolveSpotifyQuery(
  inputUrl: string,
): Promise<{ playlistName?: string; tracks: string[] }> {
  const match = inputUrl.match(/spotify\.com\/.*?(playlist|album|track|artist)\/([a-zA-Z0-9]+)/i);
  if (!match) return { tracks: [inputUrl] };

  const type = match[1].toLowerCase();
  const id = match[2];
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;

  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    const jsonMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/,
    );

    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      const entity = data?.props?.pageProps?.state?.data?.entity;
      const playlistName = entity?.name || entity?.title || 'Spotify Download';
      const trackList: string[] = [];

      if (Array.isArray(entity?.trackList) && entity.trackList.length > 0) {
        const defaultArtist = entity?.subtitle || entity?.artists?.[0]?.name || '';
        for (const item of entity.trackList) {
          const title = item?.title || item?.name || '';
          const artist = item?.subtitle || item?.artists?.[0]?.name || defaultArtist;
          if (title) {
            const query =
              artist && !title.toLowerCase().includes(artist.toLowerCase())
                ? `${artist} - ${title}`
                : title;
            trackList.push(query.trim());
          }
        }
      } else if (entity?.title || entity?.name) {
        const title = entity?.title || entity?.name || '';
        const artist = entity?.artists?.[0]?.name || entity?.subtitle || '';
        const query =
          artist && !title.toLowerCase().includes(artist.toLowerCase())
            ? `${artist} - ${title}`
            : title;
        trackList.push(query.trim());
      }

      if (trackList.length > 0) {
        return { playlistName, tracks: trackList };
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error parsing Spotify embed metadata:', err);
  }

  return { tracks: [inputUrl] };
}

/**
 * Get all current download jobs.
 */
export function getAllJobs(): DownloadJob[] {
  return Array.from(activeJobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Get a specific download job by ID.
 */
export function getJobById(jobId: string): DownloadJob | undefined {
  return activeJobs.get(jobId);
}

/**
 * Start a new background download job.
 */
export function startDownloadJob(req: DownloadRequest): DownloadJob {
  const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const playlist =
    req.playlist && req.playlist.trim() !== '' ? req.playlist.trim() : 'Descargas';
  const format = req.format === 'mp4' ? 'mp4' : 'mp3';

  const job: DownloadJob = {
    id,
    query: req.query.trim(),
    playlist,
    status: 'pending',
    progressPercent: 0,
    createdAt: new Date().toISOString(),
  };

  activeJobs.set(id, job);

  process.nextTick(() => {
    executeDownload(job, format);
  });

  return job;
}

/**
 * Execute the download process asynchronously using yt-dlp.
 */
async function executeDownload(job: DownloadJob, format: 'mp3' | 'mp4') {
  job.status = 'downloading';
  activeJobs.set(job.id, job);

  const originalQuery = job.query;
  const resolved = await resolveSpotifyQuery(originalQuery);

  const tracksToDownload = resolved.tracks;
  if (resolved.playlistName && job.playlist === 'Descargas') {
    job.playlist = resolved.playlistName;
  }

  const destFolder = path.join(MUSIC_FOLDER_PATH, job.playlist);
  if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder, { recursive: true });
  }

  const ytDlpPath = getYtDlpPath();
  const total = tracksToDownload.length;
  let failedTracks = 0;

  for (let i = 0; i < total; i++) {
    const trackQuery = tracksToDownload[i];
    job.query = `[${i + 1}/${total}] Descargando: ${trackQuery}`;
    activeJobs.set(job.id, job);

    const isUrl = /^https?:\/\//i.test(trackQuery);
    const searchTarget = isUrl ? trackQuery : `ytsearch1:${trackQuery}`;
    const outputTemplate = path.join(destFolder, '%(title)s.%(ext)s');

    const args: string[] = [
      '--no-playlist',
      '--newline',
      '--ignore-errors',
      '--output',
      outputTemplate,
    ];

    args.push('--add-metadata', '--embed-thumbnail');

    if (format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
    }

    args.push(searchTarget);

    let trackHadError = false;

    await new Promise<void>((resolve) => {
      const child = spawn(ytDlpPath, args);

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const match = text.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
        if (match) {
          const trackPct = parseFloat(match[1]);
          const overallPct = Math.min(
            100,
            Math.max(0, Math.round(((i + trackPct / 100) / total) * 100)),
          );
          job.progressPercent = overallPct;
          activeJobs.set(job.id, job);
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        if (text.includes('ERROR:') && !text.includes('DRM')) {
          trackHadError = true;
        }
      });

      child.on('close', () => {
        if (trackHadError) {
          failedTracks++;
        }
        job.progressPercent = Math.round(((i + 1) / total) * 100);
        activeJobs.set(job.id, job);
        resolve();
      });

      child.on('error', () => {
        failedTracks++;
        resolve();
      });
    });
  }

  if (failedTracks === total && total > 0) {
    job.status = 'error';
    job.error = 'No se pudo descargar ninguna canción (posible restricción de edad o copyright).';
  } else {
    job.status = 'completed';
    job.progressPercent = 100;
    job.query = `Completado (${total - failedTracks}/${total} temas): ${originalQuery}`;
    if (failedTracks > 0) {
      job.error = `Nota: ${failedTracks} ${
        failedTracks === 1 ? 'canción omitida' : 'canciones omitidas'
      } por restricción de edad o copyright en YouTube.`;
    } else {
      delete job.error;
    }
  }

  activeJobs.set(job.id, job);
}
