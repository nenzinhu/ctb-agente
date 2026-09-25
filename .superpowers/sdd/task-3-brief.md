# Task 3: Create AI provider interface and implementations

**Files:**
- Create: `lib/ai/providers/base.ts` (interface)
- Create: `lib/ai/providers/groq.ts`, `nvidia.ts`, `openrouter.ts`, `mistral.ts` (adapters)
- Create: `lib/ai/providers/chain.ts` (fallback logic)
- Create: `lib/ai/embeddings.ts` (embedding provider)
- Create: `tests/unit/providers.test.ts` (tests)

**Interfaces:**
- Produces: `AIProvider` interface with `generate()`, `getModels()`, methods; 4 provider adapters; `ProviderChain` class for fallback; `EmbeddingProvider` interface.
- Consumes: API keys from `.env.local` (GROQ_API_KEY, NVIDIA_API_KEY, OPENROUTER_API_KEY, MISTRAL_API_KEY).

## Steps

- [ ] **Step 1: Create base interface**

File: `lib/ai/providers/base.ts`

```typescript
export interface AIModel {
  id: string;
  name: string;
  maxTokens: number;
  costPer1kTokens: number; // If free tier, 0
  isFree: boolean;
}

export interface AIProvider {
  name: string;
  getModels(): Promise<AIModel[]>;
  generate(
    prompt: string,
    model: string,
    maxTokens: number,
    temperature?: number
  ): Promise<string>;
}

export interface EmbeddingProvider {
  name: string;
  embed(text: string): Promise<number[]>;
}
```

- [ ] **Step 2: Create Groq adapter**

File: `lib/ai/providers/groq.ts`

```typescript
import { AIProvider, AIModel } from './base';

export class GroqProvider implements AIProvider {
  name = 'Groq';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getModels(): Promise<AIModel[]> {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const data = await response.json();
    
    // Filter to only free models (mixtral, llama)
    return (data.data || [])
      .filter((m: any) => ['mixtral', 'llama'].some(name => m.id.includes(name)))
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        maxTokens: 4096,
        costPer1kTokens: 0,
        isFree: true,
      }));
  }

  async generate(prompt: string, model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
```

- [ ] **Step 3: Create NVIDIA NIM adapter**

File: `lib/ai/providers/nvidia.ts`

```typescript
import { AIProvider, AIModel } from './base';

export class NVIDIAProvider implements AIProvider {
  name = 'NVIDIA NIM';
  private apiKey: string;
  private baseUrl = 'https://integrate.api.nvidia.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getModels(): Promise<AIModel[]> {
    // NVIDIA NIM free tier includes llama, qwen, etc.
    return [
      { id: 'meta/llama2-70b', name: 'Llama 2 70B', maxTokens: 4096, costPer1kTokens: 0, isFree: true },
      { id: 'meta/llama-3.1-70b', name: 'Llama 3.1 70B', maxTokens: 8192, costPer1kTokens: 0, isFree: true },
      { id: 'qwen/qwen-110b', name: 'Qwen 110B', maxTokens: 4096, costPer1kTokens: 0, isFree: true },
    ];
  }

  async generate(prompt: string, model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
```

- [ ] **Step 4: Create OpenRouter adapter**

File: `lib/ai/providers/openrouter.ts`

```typescript
import { AIProvider, AIModel } from './base';

export class OpenRouterProvider implements AIProvider {
  name = 'OpenRouter';
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getModels(): Promise<AIModel[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const data = await response.json();

    // Filter to `:free` models
    return (data.data || [])
      .filter((m: any) => m.id.endsWith(':free'))
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        maxTokens: m.context_length || 4096,
        costPer1kTokens: 0,
        isFree: true,
      }))
      .slice(0, 5); // Top 5 free models
  }

  async generate(prompt: string, model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ctb-agente.vercel.app',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
```

- [ ] **Step 5: Create Mistral adapter**

File: `lib/ai/providers/mistral.ts`

```typescript
import { AIProvider, AIModel, EmbeddingProvider } from './base';

export class MistralProvider implements AIProvider {
  name = 'Mistral';
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getModels(): Promise<AIModel[]> {
    // Mistral free tier
    return [
      { id: 'mistral-small', name: 'Mistral Small', maxTokens: 8000, costPer1kTokens: 0, isFree: true },
      { id: 'mistral-medium', name: 'Mistral Medium', maxTokens: 8000, costPer1kTokens: 0, isFree: true },
    ];
  }

  async generate(prompt: string, model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}

export class MistralEmbedding implements EmbeddingProvider {
  name = 'Mistral Embed';
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-embed',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral Embed API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0]?.embedding || [];
  }
}
```

- [ ] **Step 6: Create provider chain with fallback**

File: `lib/ai/providers/chain.ts`

```typescript
import { AIProvider, AIModel } from './base';
import { GroqProvider } from './groq';
import { NVIDIAProvider } from './nvidia';
import { OpenRouterProvider } from './openrouter';
import { MistralProvider } from './mistral';

export class ProviderChain implements AIProvider {
  name = 'Provider Chain';
  private providers: AIProvider[];
  private currentProviderIndex = 0;

  constructor() {
    this.providers = [
      new GroqProvider(process.env.GROQ_API_KEY || ''),
      new NVIDIAProvider(process.env.NVIDIA_API_KEY || ''),
      new OpenRouterProvider(process.env.OPENROUTER_API_KEY || ''),
      new MistralProvider(process.env.MISTRAL_API_KEY || ''),
    ].filter(p => p !== null);
  }

  async getModels(): Promise<AIModel[]> {
    const allModels: AIModel[] = [];
    for (const provider of this.providers) {
      try {
        const models = await provider.getModels();
        allModels.push(...models);
      } catch (error) {
        console.warn(`Failed to fetch models from ${provider.name}:`, error);
      }
    }
    return allModels;
  }

  async generate(prompt: string, model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      try {
        return await provider.generate(prompt, model, maxTokens, temperature);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Provider ${provider.name} failed, trying next...`, error);
        continue;
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }
}
```

- [ ] **Step 7: Create embedding provider wrapper**

File: `lib/ai/embeddings.ts`

```typescript
import { EmbeddingProvider } from './providers/base';
import { MistralEmbedding } from './providers/mistral';

export class EmbeddingChain implements EmbeddingProvider {
  name = 'Embedding Chain';
  private providers: EmbeddingProvider[];

  constructor() {
    this.providers = [
      new MistralEmbedding(process.env.MISTRAL_API_KEY || ''),
      // Add more providers as fallback
    ].filter(p => p !== null);
  }

  async embed(text: string): Promise<number[]> {
    for (const provider of this.providers) {
      try {
        return await provider.embed(text);
      } catch (error) {
        console.warn(`${provider.name} failed:`, error);
        continue;
      }
    }
    throw new Error('All embedding providers failed');
  }
}

export const embeddingChain = new EmbeddingChain();
```

- [ ] **Step 8: Create unit tests**

File: `tests/unit/providers.test.ts`

```typescript
import { GroqProvider } from '@/lib/ai/providers/groq';
import { ProviderChain } from '@/lib/ai/providers/chain';

describe('AI Providers', () => {
  describe('GroqProvider', () => {
    it('should initialize with API key', () => {
      const provider = new GroqProvider('test-key');
      expect(provider.name).toBe('Groq');
      expect(provider.getModels).toBeDefined();
    });
  });

  describe('ProviderChain', () => {
    it('should initialize with multiple providers', () => {
      const chain = new ProviderChain();
      expect(chain.name).toBe('Provider Chain');
      expect(chain.generate).toBeDefined();
      expect(chain.getModels).toBeDefined();
    });
  });
});
```

- [ ] **Step 9: Commit**

```bash
git add lib/ai/ tests/unit/providers.test.ts
git commit -m "feat: implement pluggable AI provider chain with fallback

- Create AIProvider interface with generate() and getModels()
- Implement Groq, NVIDIA NIM, OpenRouter, Mistral adapters
- Add ProviderChain with automatic fallback on provider failure
- Implement EmbeddingChain for vector embeddings (Mistral)
- Add unit tests for provider initialization

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

Verify tests pass: `npm test tests/unit/providers.test.ts` (should show 2/2 passing)
