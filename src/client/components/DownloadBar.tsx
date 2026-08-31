import { useEffect, useRef, useState } from 'react';
import type { DownloadJob } from '@shared/types';
import { fetchDownloadStatus, requestDownload } from '@client/services/api';
import DownloadHistoryModal from './DownloadHistoryModal';
import '../styles/DownloadBar.css';

interface DownloadBarProps {
  playlists: string[];
  selectedPlaylist: string | null;
  onDownloadComplete: () => void;
}

export default function DownloadBar({
  playlists,
  selectedPlaylist,
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
    setToastMessage('Iniciando descarga en segundo plano...');

    const res = await requestDownload(query.trim(), targetPlaylist.trim(), format);

    setIsSubmitting(false);

    if (res.success) {
      setQuery('');
      setToastMessage(res.message || 'Descarga iniciada en segundo plano');
      setTimeout(() => setToastMessage(null), 4000);
      const statusRes = await fetchDownloadStatus();
      if (statusRes.success && statusRes.jobs) {
        setActiveJobs(statusRes.jobs);
      }
    } else {
      setToastMessage(`Error: ${res.error || 'No se pudo iniciar la descarga'}`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const currentDownloadingJobs = activeJobs.filter(
    (j) => j.status === 'downloading' || j.status === 'pending',
  );

  return (
    <div className="download-bar">
      <form className="download-bar__form" onSubmit={handleSubmit}>
        <div className="download-bar__input-wrapper">
          <input
            type="text"
            className="download-bar__input"
            placeholder="Pegar link de Spotify / YouTube o término..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isSubmitting}
            title="Buscador y Descargador: Pega una URL directa de YouTube/Spotify o escribe el nombre de cualquier artista o canción"
          />
        </div>

        <select
          className="download-bar__select"
          value={targetPlaylist}
          onChange={(e) => setTargetPlaylist(e.target.value)}
          title="Playlist de Destino: Elige en qué lista se guardará automáticamente la canción que vas a descargar"
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
            title="Formato Audio MP3: Descarga únicamente la pista de sonido en alta calidad"
          >
            MP3
          </button>
          <button
            type="button"
            className={`download-bar__format-btn ${format === 'mp4' ? 'active' : ''}`}
            onClick={() => setFormat('mp4')}
            title="Formato Video MP4: Descarga el video musical completo para reproducirlo en el panel de video"
          >
            MP4
          </button>
        </div>

        <button
          type="submit"
          className="download-bar__submit"
          disabled={!query.trim() || isSubmitting}
          title="Descargar Canción: Inicia la descarga automática en 1-clic y la guarda en la playlist elegida"
        >
          {isSubmitting ? 'Iniciando…' : '⬇ Descargar'}
        </button>

        <button
          type="button"
          className="download-bar__history-btn"
          onClick={() => setIsHistoryOpen(true)}
          title="Historial de Descargas: Revisa el estado de todas tus descargas pasadas y actuales"
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

