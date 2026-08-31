import React from 'react';
import './DownloadHistoryModal.css';
import type { DownloadJob } from '@shared/types';

interface DownloadHistoryModalProps {
  jobs: DownloadJob[];
  isOpen: boolean;
  onClose: () => void;
}

const DownloadHistoryModal: React.FC<DownloadHistoryModalProps> = ({
  jobs,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const getStatusBadge = (status: DownloadJob['status']) => {
    switch (status) {
      case 'completed':
        return <span className="download-modal__badge download-modal__badge--completed">Completado</span>;
      case 'downloading':
        return <span className="download-modal__badge download-modal__badge--downloading">Descargando</span>;
      case 'error':
        return <span className="download-modal__badge download-modal__badge--error">Error</span>;
      default:
        return <span className="download-modal__badge download-modal__badge--pending">Pendiente</span>;
    }
  };

  return (
    <div className="download-modal__overlay" onClick={onClose}>
      <div className="download-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="download-modal__header">
          <h3>📜 Historial de Descargas</h3>
          <button type="button" className="download-modal__close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="download-modal__body">
          {jobs.length === 0 ? (
            <p className="download-modal__empty">No hay descargas registradas.</p>
          ) : (
            <div className="download-modal__list">
              {jobs.map((job) => (
                <div key={job.id} className="download-modal__item">
                  <div className="download-modal__item-header">
                    <span className="download-modal__item-query">{job.query}</span>
                    {getStatusBadge(job.status)}
                  </div>
                  <div className="download-modal__item-info">
                    <span>Playlist: {job.playlist}</span>
                    <span>{job.progressPercent}%</span>
                  </div>
                  <div className="download-modal__bar-track">
                    <div
                      className="download-modal__bar-fill"
                      style={{ width: `${job.progressPercent}%` }}
                    />
                  </div>
                  {job.error && (
                    <div
                      className={
                        job.status === 'completed'
                          ? 'download-modal__info-msg'
                          : 'download-modal__error-msg'
                      }
                    >
                      {job.status === 'completed' ? 'ℹ️' : '⚠️'} {job.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadHistoryModal;
