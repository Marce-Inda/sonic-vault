import type { Playlist, Track } from '../../shared/types.js';
import { createVirtualPlaylist, addTrackToPlaylist } from '../services/virtualPlaylistStore.js';

export interface CurationResult {
  actionPerformed: string;
  playlistName?: string;
  affectedTrackIds: string[];
}

/**
 * Smart Curator & DJ Agent.
 * Organizes playlists and Trello board columns based on user natural language intent.
 */
export class SmartCuratorAgent {
  /**
   * Curates a playlist column by grouping matching tracks based on prompt keywords.
   */
  public curatePlaylistByKeyword(
    userPrompt: string,
    allPlaylists: Playlist[]
  ): CurationResult {
    const promptLower = userPrompt.toLowerCase();

    // Extract all tracks from all playlists
    const allTracks: Track[] = [];
    const trackMap = new Map<string, Track>();

    for (const pl of allPlaylists) {
      for (const tr of pl.tracks) {
        if (!trackMap.has(tr.id)) {
          trackMap.set(tr.id, tr);
          allTracks.push(tr);
        }
      }
    }

    // Determine target playlist name
    let targetName = '✨ Selección IA';
    if (promptLower.includes('entrenar') || promptLower.includes('gym') || promptLower.includes('fit')) {
      targetName = '⚡ Workout & Gym';
    } else if (promptLower.includes('chill') || promptLower.includes('relax') || promptLower.includes('lentas')) {
      targetName = '🌙 Relax & Chill';
    } else if (promptLower.includes('k-pop') || promptLower.includes('kpop') || promptLower.includes('bts')) {
      targetName = '💜 K-Pop Special';
    } else if (promptLower.includes('rock') || promptLower.includes('metal')) {
      targetName = '🎸 Rock & Heavy';
    }

    // Filter matching tracks based on keywords
    const keywords = promptLower.split(/\s+/).filter((k) => k.length > 2);
    const matchingTracks = allTracks.filter((track) => {
      const text = `${track.title} ${track.artist} ${track.album} ${track.playlist}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    });

    // Fallback: pick top 5 tracks if no direct keyword match
    const selectedTracks = matchingTracks.length > 0 ? matchingTracks : allTracks.slice(0, 5);
    const affectedTrackIds = selectedTracks.map((t) => t.id);

    // Create the virtual playlist and populate it
    createVirtualPlaylist(targetName);
    for (const id of affectedTrackIds) {
      addTrackToPlaylist(targetName, id);
    }

    return {
      actionPerformed: `Se creó la columna Trello "${targetName}" con ${selectedTracks.length} canciones seleccionadas por el agente.`,
      playlistName: targetName,
      affectedTrackIds,
    };
  }
}

export const smartCuratorAgent = new SmartCuratorAgent();
