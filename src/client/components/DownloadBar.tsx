import { useEffect, useRef, useState } from 'react';
import type { DownloadJob } from '@shared/types';
import { fetchDownloadStatus, requestDownload } from '@client/services/api';
import DownloadHistoryModal from './DownloadHistoryModal';
import '../styles/DownloadBar.css';

interface DownloadBarProps {
  playlists: string[];
  selectedPlaylist: string | null;
  mode?: 'local' | 'stream';
  onDownloadComplete: () => void;
}

export default function DownloadBar({
  playlists,
  selectedPlaylist,
  mode = 'local',
  onDownloadComplete,
}: DownloadBarProps) {
  const [query, setQuery] = useState('');
  const [targetPlaylist, setTargetPlaylist] = useState('');
  const [format, setFormat] = useState<'mp3' | 'mp4'>('mp3');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<DownloadJob[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const prevCompletedCountRef = useRef(0);

  // Update default target playlist when selection changes
  useEffect(() => {
    setTargetPlaylist(selectedPlaylist || 'Descargas');
  }, [selectedPlaylist]);

  // Poll for background job status every 2 seconds
  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      const res = await fetchDownloadStatus();
      if (cancelled) return;

      if (res.success && Array.isArray(res.jobs)) {
        const jobs: DownloadJob[] = res.jobs;
        setActiveJobs(jobs);

        const completedJobs = jobs.filter((j) => j.status === 'completed');
        if (completedJobs.length > prevCompletedCountRef.current) {
          prevCompletedCountRef.current = completedJobs.length;
          onDownloadComplete();
          const lastCompleted = completedJobs[0];
          setToastMessage(`✅ Completado: ${lastCompleted?.query || 'Descarga'}`);
          setTimeout(() => setToastMessage(null), 5000);
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [onDownloadComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setToastMessage(
      mode === 'stream'
        ? '⚡ Preparando stream online...'
        : 'Iniciando descarga en segundo plano...'
    );

    const res = await requestDownload(query.trim(), targetPlaylist.trim(), format);

    setIsSubmitting(false);

    if (res.success) {
      setQuery('');
      setToastMessage(
        mode === 'stream'
          ? '▶ Pista lista en tu playlist. Haz clic para reproducir en stream.'
          : res.message || 'Descarga iniciada en segundo plano'
      );
      setTimeout(() => setToastMessage(null), 5000);
      const statusRes = await fetchDownloadStatus();
      if (statusRes.success && statusRes.jobs) {
        setActiveJobs(statusRes.jobs);
      }
    } else {
      setToastMessage(`Error: ${res.error || 'No se pudo procesar la solicitud'}`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const currentDownloadingJobs = activeJobs.filter(
    (j) => j.status === 'downloading' || j.status === 'pending',
  );

  return (
    <div className="download-bar">
      {mode === 'stream' && (
        <div className="download-bar__stream-banner">
          <span>🌐 <strong>Modo Streaming Online Activo</strong> — Escribe cualquier canción, artista o pega un link para escuchar inmediatamente.</span>
        </div>
      )}

      <form className="download-bar__form" onSubmit={handleSubmit}>
        <div className="download-bar__input-wrapper">
          <input
            type="text"
            className="download-bar__input"
            placeholder={
              mode === 'stream'
                ? '🌐 Escribe un tema o pega link de YouTube/Spotify para escuchar en STREAM...'
                : 'Pegar link de Spotify / YouTube o término...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isSubmitting}
            title={
              mode === 'stream'
                ? 'Buscador de Stream Online: Escribe el nombre de una canción o pega un enlace para escucharla en directo sin descargar'
                : 'Buscador y Descargador: Pega una URL directa de YouTube/Spotify o escribe el nombre de cualquier artista o canción'
            }
          />
        </div>

        <select
          className="download-bar__select"
          value={targetPlaylist}
          onChange={(e) => setTargetPlaylist(e.target.value)}
          title="Playlist de Destino: Elige en qué lista se organizará la canción"
        >
          {playlists.map((name) => (
            <option key={name} value={name}>
              Playlist: {name}
            </option>
          ))}
          <option value="Descargas">Playlist: Descargas (Nueva)</option>
        </select>

        <div className="download-bar__format-toggle">
          <button
            type="button"
            className={`download-bar__format-btn ${format === 'mp3' ? 'active' : ''}`}
            onClick={() => setFormat('mp3')}
            title="Formato Audio MP3: Reproducir/Descargar únicamente el sonido en alta calidad"
          >
            MP3
          </button>
          <button
            type="button"
            className={`download-bar__format-btn ${format === 'mp4' ? 'active' : ''}`}
            onClick={() => setFormat('mp4')}
            title="Formato Video MP4: Reproducir/Descargar el video musical completo"
          >
            MP4
          </button>
        </div>

        <button
          type="submit"
          className="download-bar__submit"
          disabled={!query.trim() || isSubmitting}
          title={
            mode === 'stream'
              ? 'Escuchar Ya (Stream): Procesa la canción para iniciar la reproducción online inmediatamente'
              : 'Descargar Canción: Inicia la descarga automática en 1-clic y la guarda en la playlist elegida'
          }
        >
          {isSubmitting
            ? 'Cargando…'
            : mode === 'stream'
            ? '▶ Stream / Escuchar Ya'
            : '⬇ Descargar'}
        </button>

        <button
          type="button"
          className="download-bar__history-btn"
          onClick={() => setIsHistoryOpen(true)}
          title="Historial de Descargas y Streaming: Revisa tus peticiones anteriores"
        >
          📜 Historial
        </button>
      </form>

      {toastMessage && <div className="download-bar__toast">{toastMessage}</div>}

      {currentDownloadingJobs.length > 0 && (
        <div className="download-bar__active-jobs">
          {currentDownloadingJobs.map((job) => (
            <div key={job.id} className="download-bar__job-item">
              <span className="download-bar__job-title">
                ⏳ {job.query} ({job.playlist})
              </span>
              <div className="download-bar__job-progress-bg">
                <div
                  className="download-bar__job-progress-fill"
                  style={{ width: `${job.progressPercent || 5}%` }}
                />
              </div>
              <span className="download-bar__job-pct">
                {job.progressPercent ? `${Math.round(job.progressPercent)}%` : 'Descargando...'}
              </span>
            </div>
          ))}
        </div>
      )}

      <DownloadHistoryModal
        jobs={activeJobs}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

