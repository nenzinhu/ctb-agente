import { OpenAICompatibleProvider } from './openai-compatible';

/**
 * OpenAI-compatible router with no fixed base URL — must be set via
 * ORCAROUTER_BASE_URL (see .env.local.example).
 */
export class OrcaRouterProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseUrl: string) {
    super({
      name: 'OrcaRouter',
      apiKey,
      baseUrl,
      baseUrlEnvVar: 'ORCAROUTER_BASE_URL',
      filtroGratis: (id) => /free/i.test(id),
    });
  }
}
