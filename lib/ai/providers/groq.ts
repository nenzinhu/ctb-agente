import { OpenAICompatibleProvider } from './openai-compatible';

export class GroqProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string) {
    // Every Groq chat model is on the free tier; drop audio/guard models.
    super({
      name: 'Groq',
      apiKey,
      baseUrl: 'https://api.groq.com/openai/v1',
      filtroGratis: (id) => !/whisper|guard|tts|orpheus|playai/i.test(id),
    });
  }
}
