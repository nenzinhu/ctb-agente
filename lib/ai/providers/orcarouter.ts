import { OpenAICompatibleProvider } from './openai-compatible';

export const ORCAROUTER_BASE_URL_PADRAO = 'https://api.orcarouter.ai/v1';

/** OpenAI-compatible OrcaRouter client. The base URL can still be overridden. */
export class OrcaRouterProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseUrl = ORCAROUTER_BASE_URL_PADRAO) {
    super({
      name: 'OrcaRouter',
      apiKey,
      baseUrl: baseUrl || ORCAROUTER_BASE_URL_PADRAO,
      baseUrlEnvVar: 'ORCAROUTER_BASE_URL',
      filtroGratis: (id) => /free/i.test(id),
    });
  }
}
