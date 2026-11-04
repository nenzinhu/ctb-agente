'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EmbeddingModelId } from '@/lib/ai/embedding-models';

interface ModelStatus {
  id: EmbeddingModelId;
  nome: string;
  provedor: string;
  envVar: string;
  principal: boolean;
  configurado: boolean;
}

interface Status {
  modelo: EmbeddingModelId;
  modelos: ModelStatus[];
  configurado: boolean;
  esquemaPronto: boolean;
  bancoEscrita: boolean;
}

export default function AdminModeloVetorial({ onChange }: { onChange?: () => void } = {}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [choice, setChoice] = useState<EmbeddingModelId | null>(null);
  const [busy, setBusy] = useState<'salvando' | 'testando' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/embeddings', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.modelos)) throw new Error('Não foi possível consultar o modelo vetorial.');
    setStatus(data as Status);
    setChoice(data.modelo as EmbeddingModelId);
  }, []);

  useEffect(() => { void load().catch((e: Error) => setError(e.message)); }, [load]);

  const run = async (method: 'PUT' | 'POST') => {
    if (!choice || busy) return;
    setBusy(method === 'PUT' ? 'salvando' : 'testando');
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/embeddings', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelo: choice }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível concluir a operação.');
      if (method === 'PUT') {
        await load();
        onChange?.();
        setMessage('Modelo vetorial salvo. Gere os vetores pendentes na aba Base CTB ou POP-PMSC para consultar o acervo com ele.');
      } else {
        setMessage(`Modelo respondeu: ${result.dimensoes} dimensões em ${result.latenciaMs} ms.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no modelo vetorial.');
    } finally { setBusy(null); }
  };

  const selected = status?.modelos.find((model) => model.id === choice);
  return (
    <section className="card card-pad space-y-4" aria-labelledby="modelo-vetorial-titulo">
      <div>
        <h2 id="modelo-vetorial-titulo" className="text-xl font-bold text-ds-text">Modelo vetorial do RAG</h2>
        <p className="mt-1 text-sm text-ds-subtle">Escolha como o acervo será representado na busca por significado. O modelo de respostas é configurado separadamente.</p>
      </div>
      {!status ? <p className="text-sm text-ds-subtle" role="status">{error ? 'Configuração indisponível.' : 'Carregando modelos vetoriais…'}</p> : (
        <>
          <fieldset disabled={busy !== null} className="space-y-3">
            <legend className="label">Modelo usado na busca e na indexação</legend>
            {status.modelos.map((model) => (
              <label key={model.id} className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-xl border border-ds-line p-4 has-[:checked]:border-ds-primary has-[:checked]:bg-ds-primary-soft">
                <input type="radio" name="modelo-vetorial" value={model.id} checked={choice === model.id}
                  onChange={() => setChoice(model.id)} className="mt-1 h-4 w-4 accent-ds-primary" />
                <span className="min-w-0">
                  <span className="block font-semibold text-ds-text">{model.nome} {model.principal && <span className="badge-brand ml-1">Principal</span>}</span>
                  <span className="mt-1 block text-xs text-ds-subtle">{model.provedor} · {model.configurado ? 'Chave configurada' : `Chave ausente: ${model.envVar}`}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="text-sm text-ds-subtle">Os vetores Mistral existentes são preservados. A troca de modelo exige gerar os vetores próprios dele; a busca por palavras continua disponível.</p>
          {!status.esquemaPronto && <p className="alert-warn" role="note">Para usar Nemotron, aplique a migração 015 no Supabase antes de gerar os vetores.</p>}
          {status.bancoEscrita === false && <p className="alert-warn">Configure o acesso administrativo ao banco para salvar a escolha.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => void run('PUT')}
              disabled={busy !== null || choice === status.modelo || status.bancoEscrita === false}>
              {busy === 'salvando' ? 'Salvando…' : 'Salvar modelo vetorial'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => void run('POST')}
              disabled={busy !== null || !selected?.configurado}>
              {busy === 'testando' ? 'Testando…' : 'Testar modelo vetorial'}
            </button>
          </div>
        </>
      )}
      {message && <p className="text-sm text-ds-primary-strong" role="status">{message}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}
