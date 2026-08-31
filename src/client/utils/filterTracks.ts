import type { Track } from '@shared/types';

/**
 * Filters a list of tracks by a search query.
 *
 * A track matches when its title OR artist contains the query as a
 * case-insensitive substring. When the query is empty (or contains only
 * whitespace), all tracks are returned unchanged. The original order of the
 * tracks is preserved.
 *
 * @param tracks - The tracks to filter.
 * @param query - The search query.
 * @returns The tracks whose title or artist matches the query.
 */
export function filterTracks(tracks: Track[], query: string): Track[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery === '') {
    return tracks;
  }

  return tracks.filter(
    (track) =>
      track.title.toLowerCase().includes(normalizedQuery) ||
      track.artist.toLowerCase().includes(normalizedQuery),
  );
}
