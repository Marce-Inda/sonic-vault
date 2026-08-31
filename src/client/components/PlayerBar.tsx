import './PlayerBar.css';
import { usePlayer } from '@client/context/PlayerContext';
import { useAudioEngine } from '@client/hooks/useAudioEngine';
import { truncateText } from '@client/utils/truncateText';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';

/**
 * PlayerBar — fixed bottom playback bar for SpotiMP4.
 *
 * Composes the existing child controls into the three-section layout described
 * in the design (Requirement 5.2 / 5.3):
 *   - left   : TrackInfo (current track title + artist, empty when no track)
 *   - center : playback controls (previous, play/pause, next) + ProgressBar
 *   - right  : VolumeControl (slider + mute button)
 *
 * All state comes from {@link usePlayer}; playback side effects are driven
 * through {@link useAudioEngine}. When no track is active every control is
 * disabled and no track info is shown (Requirement 5.6).
 *
 * Requirements: 5.3, 5.6, 2.2, 2.3, 2.4, 3.1, 3.3, 6.3
 */
interface PlayerBarProps {
  onToggleVideoPanel?: () => void;
  onOpenKaraoke?: () => void;
  onOpenAgentChat?: () => void;
  isVideoPanelOpen?: boolean;
}

function PlayerBar({
  onToggleVideoPanel,
  onOpenKaraoke,
  onOpenAgentChat,
  isVideoPanelOpen,
}: PlayerBarProps) {
  const { state, dispatch } = usePlayer();
  const engine = useAudioEngine();

  const { currentTrack, isPlaying, currentTime, duration, volume, isMuted } = state;
  const noTrack = currentTrack === null;

  const handlePlayPause = (): void => {
    if (noTrack) return;
    if (isPlaying) {
      dispatch({ type: 'PAUSE' });
      engine.pause();
    } else {
      dispatch({ type: 'RESUME' });
      engine.resume();
    }
  };

  const handlePrevious = (): void => {
    if (noTrack) return;
    dispatch({ type: 'PREVIOUS_TRACK' });
  };

  const handleNext = (): void => {
    if (noTrack) return;
    dispatch({ type: 'NEXT_TRACK' });
  };

  const handleSeek = (time: number): void => {
    if (noTrack) return;
    dispatch({ type: 'SEEK', payload: time });
    engine.seek(time);
  };

  const handleVolumeChange = (nextVolume: number): void => {
    dispatch({ type: 'SET_VOLUME', payload: nextVolume });
    engine.setVolume(nextVolume);
  };

  const handleToggleMute = (): void => {
    dispatch({ type: 'TOGGLE_MUTE' });
  };

  const playPauseLabel = isPlaying ? 'Pausar' : 'Reproducir';

  return (
    <div className="player-bar">
      {/* Left — current track info (title + artist) + AI Orchestrator button */}
      <div className="player-bar__info">
        {onOpenAgentChat && (
          <button
            type="button"
            className="player-bar__agent-btn"
            onClick={onOpenAgentChat}
            title="Abrir Orquestador de IA (Crear Playlists y Recomendaciones)"
          >
            🤖 Asistente IA DJ
          </button>
        )}
        {currentTrack !== null && (
          <>
            <span className="player-bar__title" title={currentTrack.title}>
              {truncateText(currentTrack.title)}
            </span>
            <span className="player-bar__artist" title={currentTrack.artist}>
              {truncateText(currentTrack.artist)}
            </span>
          </>
        )}
      </div>

      {/* Center — playback controls + progress bar (Req 5.3, 2.3, 2.4, 3.1, 3.3). */}
      <div className="player-bar__center">
        <div className="player-bar__controls">
          <button
            type="button"
            className={
              state.isShuffle
                ? 'player-bar__button player-bar__button--active'
                : 'player-bar__button'
            }
            onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
            disabled={noTrack}
            aria-label="Modo aleatorio"
            title={state.isShuffle ? 'Modo Aleatorio: Activado (Mezcla las canciones al azar)' : 'Modo Aleatorio: Desactivado (Reproduce en orden)'}
          >
            <span aria-hidden="true">🔀</span>
          </button>
          <button
            type="button"
            className="player-bar__button"
            onClick={handlePrevious}
            disabled={noTrack}
            aria-label="Anterior"
            title="Pista Anterior: Regresa a la canción previa de la playlist"
          >
            <span aria-hidden="true">⏮</span>
          </button>
          <button
            type="button"
            className="player-bar__button player-bar__button--play"
            onClick={handlePlayPause}
            disabled={noTrack}
            aria-label={playPauseLabel}
            title={isPlaying ? 'Pausar Reproducción: Pausa temporalmente la canción activa' : 'Reproducir: Inicia o reanuda la canción activa'}
          >
            <span aria-hidden="true">{isPlaying ? '⏸' : '▶'}</span>
          </button>
          <button
            type="button"
            className="player-bar__button"
            onClick={handleNext}
            disabled={noTrack}
            aria-label="Siguiente"
            title="Siguiente Pista: Salta a la siguiente canción de la playlist"
          >
            <span aria-hidden="true">⏭</span>
          </button>
        </div>

        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          disabled={noTrack}
        />
      </div>

      {/* Right — volume slider + extra feature buttons (Video, Karaoke, AI Chat). */}
      <div className="player-bar__volume">
        {onOpenKaraoke && (
          <button
            type="button"
            className="player-bar__button"
            onClick={onOpenKaraoke}
            disabled={noTrack}
            title="Karaoke & Letras: Muestra la letra sincronizada en pantalla completa con fonética Romaja y español"
          >
            <span aria-hidden="true">🎤</span>
          </button>
        )}

        {onToggleVideoPanel && (
          <button
            type="button"
            className={
              isVideoPanelOpen
                ? 'player-bar__button player-bar__button--active'
                : 'player-bar__button'
            }
            onClick={onToggleVideoPanel}
            title="Panel de Video Lateral (50% Pantalla): Abre u oculta el reproductor de video gigante y la lírica"
          >
            <span aria-hidden="true">🎬</span>
          </button>
        )}

        {onOpenAgentChat && (
          <button
            type="button"
            className="player-bar__button"
            onClick={onOpenAgentChat}
            title="Asistente de IA: Abre el chat interactivo para pedirle recomendaciones musicales"
          >
            <span aria-hidden="true">🤖</span>
          </button>
        )}

        <VolumeControl
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          disabled={noTrack}
        />
      </div>
    </div>
  );
}

export default PlayerBar;
