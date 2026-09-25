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
  /** Embeds many texts in one request, returned in input order. */
  embedBatch?(texts: string[]): Promise<number[][]>;
}
