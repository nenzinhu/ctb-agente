import { OpenAICompatibleProvider } from './openai-compatible';

export class NousProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseUrl = 'https://inference-api.nousresearch.com/v1') {
    super({ name: 'Nous Portal', apiKey, baseUrl });
  }
}
