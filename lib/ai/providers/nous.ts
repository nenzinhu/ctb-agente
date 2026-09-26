import { OpenAICompatibleProvider, precoZero } from './openai-compatible';

export class NousProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseUrl = 'https://inference-api.nousresearch.com/v1') {
    super({
      name: 'Nous Portal',
      apiKey,
      baseUrl,
      // The free catalog rotates: trust the prices and the ":free" routes
      // the portal publishes instead of a hard-coded list.
      filtroGratis: (id, modelo) => id.endsWith(':free') || precoZero(modelo),
    });
  }
}
