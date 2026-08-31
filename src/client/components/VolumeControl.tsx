import './VolumeControl.css';

/**
 * Props for the VolumeControl component.
 */
export interface VolumeControlProps {
  /** Current volume level in the range [0, 1] (0% – 100%). */
  volume: number;
  /** Whether the audio is currently muted. */
  isMuted: boolean;
  /** Called with the new volume in [0, 1] when the slider changes. */
  onVolumeChange: (volume: number) => void;
  /** Called when the mute/unmute button is pressed. */
  onToggleMute: () => void;
  /** Disables the slider and button when no track is active. */
  disabled?: boolean;
}

/**
 * Returns a volume icon that reflects the current mute state / level.
 *
 * Muted (or 0 volume) shows a muted speaker, otherwise the glyph scales with
 * the loudness so the button visually communicates the current level.
 */
function volumeIcon(isMuted: boolean, volume: number): string {
  if (isMuted || volume === 0) {
    return '🔇';
  }
  if (volume < 0.5) {
    return '🔉';
  }
  return '🔊';
}

/**
 * VolumeControl — volume slider plus a mute/unmute toggle button for the
 * player bar.
 *
 * The slider ranges from 0 to 1 with a step of 0.01, giving 1% increments
 * across the full 0% – 100% range (Requirement 3.7). The toggle button
 * reflects the current mute state and drives the mute/unmute round trip
 * handled by the player state (Requirements 3.8, 3.9).
 *
 * This is a controlled presentational component: it reports slider changes
 * through `onVolumeChange` and button presses through `onToggleMute`, leaving
 * the actual clamping and previous-volume bookkeeping to the player reducer.
 *
 * Requirements:
 *   - 3.7 Volume slider from 0% to 100% in 1% increments.
 *   - 3.8 Mute button toggles audio off without altering the stored volume.
 *   - 3.9 Pressing mute while muted restores the previous volume.
 */
function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  disabled = false,
}: VolumeControlProps) {
  // When muted, show the slider at 0 to reflect the silenced output while the
  // reducer keeps the previous volume for restoration.
  const displayVolume = isMuted ? 0 : volume;
  const percent = Math.round(displayVolume * 100);
  const muteLabel = isMuted ? 'Activar sonido' : 'Silenciar';

  return (
    <div className="volume-control">
      <button
        type="button"
        className="volume-control__mute"
        onClick={onToggleMute}
        disabled={disabled}
        aria-label={muteLabel}
        aria-pressed={isMuted}
        title={muteLabel}
      >
        <span aria-hidden="true">{volumeIcon(isMuted, volume)}</span>
      </button>
      <input
        className="volume-control__slider"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={displayVolume}
        onChange={(event) => onVolumeChange(Number(event.target.value))}
        disabled={disabled}
        aria-label="Volumen"
        aria-valuetext={`${percent}%`}
      />
    </div>
  );
}

export default VolumeControl;
