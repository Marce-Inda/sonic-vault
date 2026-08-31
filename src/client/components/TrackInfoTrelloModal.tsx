import React from 'react';
import type { Track } from '@shared/types';
import './TrackInfoTrelloModal.css';

interface TrackInfoTrelloModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadTrack?: (query: string) => void;
}

export const TrackInfoTrelloModal: React.FC<TrackInfoTrelloModalProps> = ({
  track,
  isOpen,
  onClose,
  onDownloadTrack,
}) => {
  if (!isOpen || !track) return null;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="trello-modal__overlay" onClick={onClose}>
      <div
        className="trello-card-popup"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Información de Pista Trello"
      >
        <div className="trello-card-popup__header">
          <div className="trello-card-popup__badge">🎴 Tarjeta de Información</div>
          <button type="button" className="trello-card-popup__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="trello-card-popup__body">
          <div className="trello-card-popup__cover">
            <span className="trello-card-popup__icon">{track.isVideo ? '🎬' : '🎶'}</span>
          </div>

          <h2 className="trello-card-popup__title">{track.title}</h2>
          <h3 className="trello-card-popup__artist">{track.artist}</h3>

          <div className="trello-card-popup__grid">
            <div className="trello-card-popup__info-item">
              <span className="info-label">⏱️ Duración:</span>
              <span className="info-value">{formatDuration(track.durationSeconds)}</span>
            </div>

            <div className="trello-card-popup__info-item">
              <span className="info-label">📁 Archivo:</span>
              <span className="info-value">{track.fileName}</span>
            </div>

            <div className="trello-card-popup__info-item">
              <span className="info-label">🎥 Tipo:</span>
              <span className="info-value">{track.isVideo ? 'Video MP4' : 'Audio MP3'}</span>
            </div>

            <div className="trello-card-popup__info-item">
              <span className="info-label">⚡ ID:</span>
              <span className="info-value">{track.id}</span>
            </div>
          </div>

          <div className="trello-card-popup__actions">
            {onDownloadTrack && (
              <button
                type="button"
                className="trello-popup-btn trello-popup-btn--dl"
                onClick={() => {
                  onDownloadTrack(`${track.artist} ${track.title}`);
                  onClose();
                }}
              >
                ⬇ Re-Descargar Pista
              </button>
            )}
            <button type="button" className="trello-popup-btn" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackInfoTrelloModal;
