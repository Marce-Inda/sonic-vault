import './ProgressBar.css';
import { formatDuration } from '@client/utils/formatDuration';

/**
 * Props for the ProgressBar component.
 */
export interface ProgressBarProps {
  /** Current playback position, in seconds. */
  currentTime: number;
  /** Total duration of the current track, in seconds. */
  duration: number;
  /** Called with the new time (seconds) when the user drags/clicks to seek. */
  onSeek: (time: number) => void;
  /** When true (or when there is no duration), the control is disabled. */
  disabled?: boolean;
}

/**
 * ProgressBar — interactive playback progress control for the PlayerBar.
 *
 * Uses a native `<input type="range">` for accessible drag/click seeking
 * (keyboard, pointer and screen-reader support). The filled portion and the
 * thumb use the magenta accent color from the theme (Requirement 5.x / 5.4).
 *
 * Requirements:
 *   - 3.6 Dragging the bar repositions playback to the corresponding time
 *         within the track duration.
 *   - 2.2 Display elapsed time and total duration in formatted style
 *         (mm:ss / hh:mm:ss).
 */
function ProgressBar({ currentTime, duration, onSeek, disabled }: ProgressBarProps) {
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const isDisabled = disabled === true || !hasDuration;

  // Clamp the displayed position to [0, duration] so the thumb never overflows.
  const max = hasDuration ? duration : 0;
  const clampedTime = Math.min(Math.max(currentTime, 0), max);

  // Percentage of the track that has elapsed, used to paint the filled portion.
  const progressPercent = hasDuration ? (clampedTime / duration) * 100 : 0;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) {
      return;
    }
    const value = Number(event.target.value);
    // Clamp the seek target to [0, duration] (Property 6 / Requirement 3.6).
    const seekTime = Math.min(Math.max(value, 0), duration);
    onSeek(seekTime);
  };

  return (
    <div className="progress-bar">
      <span className="progress-bar__time progress-bar__time--current">
        {formatDuration(clampedTime)}
      </span>
      <input
        type="range"
        className="progress-bar__range"
        min={0}
        max={max}
        step={0.1}
        value={clampedTime}
        disabled={isDisabled}
        onChange={handleChange}
        aria-label="Progreso de la pista"
        aria-valuetext={formatDuration(clampedTime)}
        style={{ '--progress-percent': `${progressPercent}%` } as React.CSSProperties}
      />
      <span className="progress-bar__time progress-bar__time--total">
        {formatDuration(hasDuration ? duration : 0)}
      </span>
    </div>
  );
}

export default ProgressBar;
