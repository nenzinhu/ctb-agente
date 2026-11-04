export const NEMOTRON_EMBED_MODEL = 'nvidia/nemotron-3.5-embed-8b:free';
export const MISTRAL_EMBED_MODEL = 'mistral-embed';
export const EMBEDDING_DIMENSIONS = 1024;

export const EMBEDDING_MODELS = [
  { id: NEMOTRON_EMBED_MODEL, nome: 'NVIDIA: Nemotron 3.5 Embed 8B (free)', provedor: 'OpenRouter', envVar: 'OPENROUTER_API_KEY', coluna: 'embedding_nemotron', principal: true },
  { id: MISTRAL_EMBED_MODEL, nome: 'Mistral Embed', provedor: 'Mistral', envVar: 'MISTRAL_API_KEY', coluna: 'embedding', principal: false },
] as const;

export type EmbeddingModelId = typeof EMBEDDING_MODELS[number]['id'];
export type EmbeddingColumn = typeof EMBEDDING_MODELS[number]['coluna'];
export type EmbeddingModel = typeof EMBEDDING_MODELS[number];
export type EmbeddingConfig = EmbeddingModel & { configurado: boolean };

export function isEmbeddingModelId(value: unknown): value is EmbeddingModelId {
  return EMBEDDING_MODELS.some((modelo) => modelo.id === value);
}

export function embeddingModel(id: EmbeddingModelId): EmbeddingModel {
  return EMBEDDING_MODELS.find((modelo) => modelo.id === id)!;
}
