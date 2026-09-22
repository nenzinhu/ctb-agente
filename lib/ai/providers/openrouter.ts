import { OpenAICompatibleProvider } from './openai-compatible';

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string) {
    super({
      name: 'OpenRouter',
      apiKey,
      baseUrl: 'https://openrouter.ai/api/v1',
      filtroGratis: (id) => id.endsWith(':free') || id === 'openrouter/free',
      headers: { 'HTTP-Referer': 'https://ctb-agente.vercel.app', 'X-Title': 'CTB Agente' },
    });
  }
}
