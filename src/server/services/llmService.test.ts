import { describe, expect, it } from 'vitest';
import { omniRouteService } from './llmService.js';

describe('llmService (OmniRoute)', () => {
  it('instantiates OmniRouteService with provider fallback chain', () => {
    expect(omniRouteService).toBeDefined();
  });

  it('returns null gracefully when no API keys are configured', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    const originalGroq = process.env.GROQ_API_KEY;
    const originalOpenRouter = process.env.OPENROUTER_API_KEY;

    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const result = await omniRouteService.generateCompletion('Hello AI');
    expect(result).toBeNull();

    if (originalGemini) process.env.GEMINI_API_KEY = originalGemini;
    if (originalGroq) process.env.GROQ_API_KEY = originalGroq;
    if (originalOpenRouter) process.env.OPENROUTER_API_KEY = originalOpenRouter;
  });
});
