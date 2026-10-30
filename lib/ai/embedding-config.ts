import { databaseAdminConfigured, supabaseAdmin } from '@/lib/db/client';
import { embeddingModel, isEmbeddingModelId, MISTRAL_EMBED_MODEL, NEMOTRON_EMBED_MODEL,
  type EmbeddingConfig, type EmbeddingModelId } from './embedding-models';

const SETTINGS_KEY = 'rag_embeddings';

/** Explicit preference wins; auto mode preserves a legacy Mistral-only installation. */
export async function getEmbeddingConfig(): Promise<EmbeddingConfig> {
  const envModel = process.env.RAG_EMBEDDING_MODEL;
  let id: EmbeddingModelId = isEmbeddingModelId(envModel) ? envModel
    : process.env.OPENROUTER_API_KEY ? NEMOTRON_EMBED_MODEL
      : process.env.MISTRAL_API_KEY ? MISTRAL_EMBED_MODEL : NEMOTRON_EMBED_MODEL;
  if (databaseAdminConfigured) {
    try {
      const { data, error } = await supabaseAdmin.from('configuracoes').select('valor').eq('chave', SETTINGS_KEY).maybeSingle();
      const saved = (data?.valor as { modelo?: unknown } | null)?.modelo;
      if (!error && isEmbeddingModelId(saved)) id = saved;
    } catch {
      // Env configuration works before the administrative database is ready.
    }
  }
  const model = embeddingModel(id);
  return { ...model, configurado: Boolean(process.env[model.envVar]?.trim()) };
}

export async function setEmbeddingModel(id: EmbeddingModelId): Promise<void> {
  if (!isEmbeddingModelId(id)) throw new Error('Modelo vetorial não permitido.');
  if (!databaseAdminConfigured) throw new Error('Configure o acesso administrativo ao banco para salvar o modelo vetorial.');
  const { error } = await supabaseAdmin.from('configuracoes').upsert({
    chave: SETTINGS_KEY, valor: { modelo: id }, atualizado_em: new Date().toISOString(),
  });
  if (error) throw new Error(`Falha ao salvar o modelo vetorial: ${error.message}`);
}
