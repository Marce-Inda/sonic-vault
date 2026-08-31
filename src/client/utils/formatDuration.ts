/**
 * Formats a non-negative duration in seconds into a human-readable string.
 *
 * - Durations < 3600 seconds are formatted as "mm:ss".
 * - Durations >= 3600 seconds are formatted as "hh:mm:ss".
 * - Each component is zero-padded to 2 digits.
 * - Fractional seconds are floored; negative inputs are treated as 0.
 *
 * Validates: Requirements 2.2, 6.4
 */
export function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (totalSeconds < 3600) {
    return `${pad(minutes)}:${pad(secs)}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}
