import React, { useEffect, useRef } from 'react';
import type { Track } from '@shared/types';
import './VideoPanel.css';

interface VideoPanelProps {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoPanel: React.FC<VideoPanelProps> = ({
  track,
  isPlaying,
  currentTime,
  isOpen,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isVideoTrack = Boolean(
    track &&
      (track.isVideo || track.fileName.toLowerCase().endsWith('.mp4'))
  );

  // Keep video synchronized with audio currentTime & play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoTrack) return;

    if (Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime;
    }

    if (isPlaying) {
      if (video.paused) {
        void video.play().catch(() => {});
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [currentTime, isPlaying, isVideoTrack]);

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="video-panel" aria-label="Panel de Video y Detalle">
      <div className="video-panel__header">
        <h3 className="video-panel__title">
          {isVideoTrack ? '🎬 Reproductor de Video' : '🎵 En Reproducción'}
        </h3>
        <button
          type="button"
          className="video-panel__close-btn"
          onClick={onClose}
          aria-label="Cerrar panel lateral"
        >
          ✕
        </button>
      </div>

      <div className="video-panel__content">
        {track ? (
          <>
            <div className="video-panel__media-container">
              {isVideoTrack ? (
                <video
                  ref={videoRef}
                  className="video-panel__video-element"
                  src={track.streamUrl}
                  muted // Audio comes from main audio engine
                  playsInline
                />
              ) : (
                <div className="video-panel__fallback-art">
                  <div className="video-panel__disc-icon">⚡</div>
                  <div className="video-panel__wave-bars">
                    <span className={`wave-bar ${isPlaying ? 'wave-bar--animating' : ''}`} />
                    <span className={`wave-bar ${isPlaying ? 'wave-bar--animating' : ''}`} />
                    <span className={`wave-bar ${isPlaying ? 'wave-bar--animating' : ''}`} />
                    <span className={`wave-bar ${isPlaying ? 'wave-bar--animating' : ''}`} />
                  </div>
                </div>
              )}
            </div>

            <div className="video-panel__info">
              <h4 className="video-panel__track-title" title={track.title}>
                {track.title}
              </h4>
              <p className="video-panel__track-artist">{track.artist}</p>
              {track.album && (
                <p className="video-panel__track-album">Álbum: {track.album}</p>
              )}
              <span className="video-panel__badge">
                {isVideoTrack ? '📹 Archivo MP4 Video' : '🎧 Archivo MP3 Audio'}
              </span>
            </div>
          </>
        ) : (
          <div className="video-panel__empty">
            <p>Selecciona una canción o video para comenzar la reproducción.</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default VideoPanel;
