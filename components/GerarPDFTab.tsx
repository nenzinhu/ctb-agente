'use client';

import { useState } from 'react';
import {
  SECOES_LABELS,
  SECOES_PADRAO,
  THEMES,
  type SecoesDossie,
} from '@/lib/pdf/themes';

export default function GerarPDFTab() {
  const [temaId, setTemaId] = useState(THEMES[0]?.id ?? '');
  const [secoes, setSecoes] = useState<SecoesDossie>({ ...SECOES_PADRAO, projetosDeLei: true });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cache, setCache] = useState<'HIT' | 'MISS' | null>(null);

  const tema = THEMES.find((t) => t.id === temaId);

  const alternarSecao = (chave: keyof SecoesDossie) => {
    setSecoes((atual) => ({ ...atual, [chave]: !atual[chave] }));
  };

  const gerar = async () => {
    if (!temaId) return;

    setCarregando(true);
    setErro(null);
    setCache(null);

    try {
      const resposta = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temaId, secoes }),
      });

      if (!resposta.ok) {
        const detalhe = (await resposta.json().catch(() => null)) as { message?: string } | null;
        throw new Error(detalhe?.message || 'Falha ao gerar o dossiê.');
      }

      setCache((resposta.headers.get('X-CTB-Cache') as 'HIT' | 'MISS') ?? null);

      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ctb-${temaId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido ao gerar o PDF.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Gerar Dossiê em PDF
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Escolha um tema e as seções para gerar um dossiê com normas, enquadramentos e
        procedimentos.
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
        <div>
          <label
            htmlFor="tema"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            Tema
          </label>
          <select
            id="tema"
            value={temaId}
            onChange={(e) => setTemaId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ctb-green focus:border-transparent"
          >
            {THEMES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {tema?.artigo && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Âncora legal: {tema.artigo} · códigos MBFT {tema.codigos.join(', ')}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Seções do dossiê
          </legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {(Object.keys(SECOES_LABELS) as (keyof SecoesDossie)[]).map((chave) => (
              <label
                key={chave}
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={secoes[chave]}
                  onChange={() => alternarSecao(chave)}
                  className="mt-1"
                />
                <span>{SECOES_LABELS[chave]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            💡 O dossiê inclui normas literais, cartões de enquadramento, checklist do AIT,
            exemplos ilustrativos e jurisprudência cadastrada. Projetos de lei entram sempre
            marcados como <strong>PROPOSTA</strong>, nunca como lei vigente.
          </p>
        </div>

        {erro && (
          <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg" role="alert">
            <p className="text-sm text-red-900 dark:text-red-100">{erro}</p>
          </div>
        )}

        {cache && !erro && (
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {cache === 'HIT' ? '⚡ Dossiê entregue do cache' : '🆕 Dossiê gerado agora'}
          </p>
        )}

        <button
          onClick={gerar}
          disabled={carregando || !temaId}
          className="w-full bg-ctb-green hover:bg-ctb-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {carregando ? 'Gerando dossiê…' : 'Baixar PDF'}
        </button>
      </div>
    </div>
  );
}
