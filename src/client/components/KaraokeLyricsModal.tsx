import React, { useEffect, useRef, useState } from 'react';
import type { SongLyrics, Track } from '@shared/types';
import './KaraokeLyricsModal.css';

interface KaraokeLyricsModalProps {
  track: Track | null;
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
}

export type LyricsDisplayMode = 'all' | 'original' | 'phonetic' | 'es' | 'en';

export const KaraokeLyricsModal: React.FC<KaraokeLyricsModalProps> = ({
  track,
  currentTime,
  isOpen,
  onClose,
}) => {
  const [lyrics, setLyrics] = useState<SongLyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LyricsDisplayMode>('all');
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !track) return;

    setLoading(true);
    const query = new URLSearchParams({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      filePath: track.fileName,
    });

    fetch(`/api/agent/lyrics?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setLyrics(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, track]);

  // Find active line index based on currentTime
  const activeIndex = lyrics?.lines.reduce((acc, line, idx) => {
    if (currentTime >= line.timeSeconds) {
      return idx;
    }
    return acc;
  }, 0) ?? 0;

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div className="karaoke-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="karaoke-modal" onClick={(e) => e.stopPropagation()}>
        <div className="karaoke-modal__header">
          <div className="karaoke-modal__title-group">
            <h2 className="karaoke-modal__title">🎤 Karaoke & Letras Multilingües</h2>
            {track && (
              <p className="karaoke-modal__subtitle">
                {track.title} — <span className="karaoke-modal__artist">{track.artist}</span>
              </p>
            )}
          </div>
          <button type="button" className="karaoke-modal__close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="karaoke-modal__mode-bar">
          <button
            type="button"
            className={`mode-btn ${mode === 'all' ? 'mode-btn--active' : ''}`}
            onClick={() => setMode('all')}
          >
            🌟 Vista Completa
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'phonetic' ? 'mode-btn--active' : ''}`}
            onClick={() => setMode('phonetic')}
          >
            🗣️ Fonética (Romaja)
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'es' ? 'mode-btn--active' : ''}`}
            onClick={() => setMode('es')}
          >
            🇪🇸 Español
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'en' ? 'mode-btn--active' : ''}`}
            onClick={() => setMode('en')}
          >
            🇬🇧 English
          </button>
        </div>

        <div className="karaoke-modal__body">
          {loading ? (
            <p className="karaoke-modal__status">Sincronizando y traduciendo letras...</p>
          ) : lyrics && lyrics.lines.length > 0 ? (
            <div className="karaoke-lines">
              {lyrics.lines.map((line, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={`${line.timestamp}-${idx}`}
                    ref={isActive ? activeLineRef : null}
                    className={`karaoke-line ${isActive ? 'karaoke-line--active' : ''}`}
                  >
                    <span className="karaoke-line__time">{line.timestamp}</span>

                    <div className="karaoke-line__texts">
                      {(mode === 'all' || mode === 'original') && (
                        <div className="karaoke-line__original">{line.text}</div>
                      )}

                      {(mode === 'all' || mode === 'phonetic') && line.phonetic && (
                        <div className="karaoke-line__phonetic">🗣️ {line.phonetic}</div>
                      )}

                      {(mode === 'all' || mode === 'es') && line.translationEs && (
                        <div className="karaoke-line__trans-es">🇪🇸 {line.translationEs}</div>
                      )}

                      {(mode === 'all' || mode === 'en') && line.translationEn && (
                        <div className="karaoke-line__trans-en">🇬🇧 {line.translationEn}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="karaoke-modal__status">No hay letras disponibles para esta pista.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default KaraokeLyricsModal;
