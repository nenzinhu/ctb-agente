import { OpenAICompatibleProvider } from './openai-compatible';

export class NVIDIAProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string) {
    // build.nvidia.com free credits cover every hosted model; drop the
    // embedding/reward/safety/parse ones, which can't answer a chat prompt.
    super({
      name: 'NVIDIA NIM',
      apiKey,
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      filtroGratis: (id) => !/embed|reward|guard|safety|parse|retriever|clip|vision|vlm|diffusion/i.test(id),
    });
  }
}
