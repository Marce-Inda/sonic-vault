import React, { useEffect, useRef, useState } from 'react';
import type { Track } from '@shared/types';
import { romajaService } from '../../shared/romaja';
import './VideoPanel.css';

interface VideoPanelProps {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenInfoModal?: (track: Track) => void;
}

export const VideoPanel: React.FC<VideoPanelProps> = ({
  track,
  isPlaying,
  currentTime,
  isOpen,
  onClose,
  onOpenInfoModal,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);
  const [lyricsMode, setLyricsMode] = useState<'original' | 'phonetic' | 'spanish'>('phonetic');

  const isVideoTrack = Boolean(
    track &&
      (track.isVideo || track.fileName.toLowerCase().endsWith('.mp4'))
  );

  // Synchronize video element with currentTime & isPlaying
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

  // Auto-scroll active lyric line into view
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime]);

  if (!isOpen) return null;

  const rawLyrics = track?.lyrics || [
    { timeSeconds: 0, text: '🎵 Escuchando pista en SonicVault...' },
    { timeSeconds: 5, text: 'Disfruta de la música en alta calidad' },
  ];

  const processedLyrics = rawLyrics.map((line) => {
    let display = line.text;
    if (lyricsMode === 'phonetic') {
      display = romajaService.romanize(line.text);
    } else if (lyricsMode === 'spanish') {
      display = line.spanishTranslation || romajaService.romanize(line.text);
    }
    return { ...line, displayText: display };
  });

  const activeIndex = processedLyrics.reduce((acc, line, idx) => {
    if (currentTime >= line.timeSeconds) return idx;
    return acc;
  }, 0);

  return (
    <aside className="video-panel" aria-label="Panel de Video y Lírica">
      <div className="video-panel__header">
        <h3 className="video-panel__title">
          {isVideoTrack ? '🎬 Reproductor de Video (50%)' : '🎵 En Reproducción'}
        </h3>
        <div className="video-panel__header-actions">
          {track && onOpenInfoModal && (
            <button
              type="button"
              className="video-panel__info-btn"
              title="Información Trello"
              onClick={() => onOpenInfoModal(track)}
            >
              ℹ️ Info
            </button>
          )}
          <button
            type="button"
            className="video-panel__close-btn"
            onClick={onClose}
            aria-label="Cerrar panel lateral"
          >
            ✕
          </button>
        </div>
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
                  muted
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
            </div>

            {/* Integrated Karaoke & Lyrics Section */}
            <div className="video-panel__lyrics-container">
              <div className="lyrics-header">
                <span className="lyrics-title">🎤 Karaoke Sincronizado</span>
                <div className="lyrics-mode-toggle">
                  <button
                    type="button"
                    className={`lyrics-mode-btn ${lyricsMode === 'original' ? 'lyrics-mode-btn--active' : ''}`}
                    onClick={() => setLyricsMode('original')}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    className={`lyrics-mode-btn ${lyricsMode === 'phonetic' ? 'lyrics-mode-btn--active' : ''}`}
                    onClick={() => setLyricsMode('phonetic')}
                  >
                    Romaja
                  </button>
                  <button
                    type="button"
                    className={`lyrics-mode-btn ${lyricsMode === 'spanish' ? 'lyrics-mode-btn--active' : ''}`}
                    onClick={() => setLyricsMode('spanish')}
                  >
                    Español
                  </button>
                </div>
              </div>

              <div className="lyrics-body">
                {processedLyrics.map((line, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <p
                      key={idx}
                      ref={isActive ? activeLineRef : null}
                      className={`lyric-line ${isActive ? 'lyric-line--active' : ''}`}
                    >
                      {line.displayText}
                    </p>
                  );
                })}
              </div>
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
