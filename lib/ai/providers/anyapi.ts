import { OpenAICompatibleProvider } from './openai-compatible';

/**
 * OpenAI-compatible endpoint with no fixed base URL — must be set via
 * ANYAPI_BASE_URL (see .env.local.example).
 */
export class AnyApiProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseUrl: string) {
    super({
      name: 'AnyAPI',
      apiKey,
      baseUrl,
      baseUrlEnvVar: 'ANYAPI_BASE_URL',
      filtroGratis: (id) => id.endsWith(':free'),
    });
  }
}
