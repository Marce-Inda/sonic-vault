/**
 * OmniRoute LLM Service for SonicVault.
 *
 * Implements a resilient Multi-Provider Fallback Manager supporting free API tiers:
 * 1. Google Gemini API (gemini-1.5-flash / gemini-2.0-flash)
 * 2. Groq API (llama-3.1-8b-instant / mixtral-8x7b-32768)
 * 3. OpenRouter API (free tier models like meta-llama/llama-3.1-8b-instruct:free)
 * 4. Offline Fallback (Rule Engine) if no keys are provided or all APIs fail.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProviderConfig {
  name: string;
  enabled: boolean;
  call: (messages: LLMMessage[]) => Promise<string | null>;
}

/**
 * Call Google Gemini API (Free Tier)
 */
async function callGemini(messages: LLMMessage[]): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const userPrompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

/**
 * Call Groq API (Free Tier - Llama 3)
 */
async function callGroq(messages: LLMMessage[]): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

/**
 * Call OpenRouter API (Free Models)
 */
async function callOpenRouter(messages: LLMMessage[]): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/Marce-Inda/sonic-vault',
        'X-Title': 'SonicVault',
      },
      body: JSON.stringify({
        model: 'inclusionai/ling-3.0-flash-fin:free',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export class OmniRouteService {
  private providers: LLMProviderConfig[] = [
    { name: 'Google Gemini', enabled: true, call: callGemini },
    { name: 'Groq API', enabled: true, call: callGroq },
    { name: 'OpenRouter Free', enabled: true, call: callOpenRouter },
  ];

  /**
   * Executes LLM completion by trying providers sequentially until one succeeds.
   */
  public async generateCompletion(
    userPrompt: string,
    systemPrompt?: string
  ): Promise<{ text: string; providerName: string } | null> {
    const messages: LLMMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    for (const provider of this.providers) {
      if (!provider.enabled) continue;

      const result = await provider.call(messages);
      if (result && result.trim()) {
        return {
          text: result.trim(),
          providerName: provider.name,
        };
      }
    }

    return null;
  }
}

export const omniRouteService = new OmniRouteService();
