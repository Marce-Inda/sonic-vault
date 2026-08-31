import type { AgentChatResponse, Playlist } from '../../shared/types.js';
import { audioHygieneAgent } from './audioHygieneAgent.js';
import { smartCuratorAgent } from './smartCuratorAgent.js';
import { omniRouteService } from '../services/llmService.js';

export class SonicVaultOrchestrator {
  /**
   * Processes natural language user messages using OmniRoute (LLM fallback chain)
   * and routes tasks to specialized agents.
   */
  public async handleUserChat(
    message: string,
    allPlaylists: Playlist[],
    currentTrackId?: string
  ): Promise<AgentChatResponse> {
    const prompt = message.trim();
    const lower = prompt.toLowerCase();

    let actionPerformed: string | undefined;
    let extraDetails = '';

    // Execute specialized agent actions when intent is detected
    if (
      lower.includes('playlist') ||
      lower.includes('crea') ||
      lower.includes('arma') ||
      lower.includes('trello') ||
      lower.includes('columna') ||
      lower.includes('entrenar') ||
      lower.includes('chill') ||
      lower.includes('rock') ||
      lower.includes('k-pop')
    ) {
      const result = smartCuratorAgent.curatePlaylistByKeyword(prompt, allPlaylists);
      actionPerformed = result.actionPerformed;
      extraDetails = `\n\n📌 Accion ejecutada: ${result.actionPerformed}`;
    } else if (lower.includes('limpia') || lower.includes('metadatos') || lower.includes('nombre')) {
      const targetTitle = currentTrackId || 'DUKI - GIVENCHY (Video Oficial) [4K] HD.mp4';
      const cleaned = audioHygieneAgent.cleanMetadata(targetTitle);
      actionPerformed = 'clean_metadata';
      extraDetails = `\n\n🏷️ Metadatos Limpios: "${cleaned.cleanTitle}" por "${cleaned.cleanArtist}"`;
    }

    // Try OmniRoute LLM Chain (Gemini -> Groq -> OpenRouter)
    const systemPrompt = `Eres SonicVault AI Orchestrator, el asistente inteligente y DJ de la app SonicVault (SpotiMP4).
Tu objetivo es ayudar al usuario a gestionar su biblioteca musical local, armar columnas de playlists estilo Trello y dar consejos sobre reproducción, karaoke y letras con romanización fonética (Romaja).
Sé conciso, carismático y amable. Responde en español usando formato Markdown con emojis de neón.`;

    const llmResult = await omniRouteService.generateCompletion(
      `${prompt}${extraDetails}`,
      systemPrompt
    );

    if (llmResult) {
      return {
        success: true,
        reply: `🤖 **SonicVault AI (${llmResult.providerName})**:\n${llmResult.text}`,
        actionPerformed,
      };
    }

    // Fallback: Smart local rule response if no API keys are set or all LLMs fail
    if (actionPerformed) {
      return {
        success: true,
        reply: `🤖 **SonicVault AI Orchestrator**:${extraDetails}`,
        actionPerformed,
      };
    }

    return {
      success: true,
      reply: `🤖 **SonicVault AI Orchestrator**:\nEntendido. Puedo ayudarte a:\n1. 🎧 **Armar playlists en Trello**: *"Agente, armame una lista chill"*\n2. 🏷️ **Limpiar metadatos**: *"Limpia las canciones descargadas"*\n3. 🎤 **Ver letras y fonética**: Pídeme letras o romanización de cualquier canción.`,
    };
  }
}

export const sonicVaultOrchestrator = new SonicVaultOrchestrator();
