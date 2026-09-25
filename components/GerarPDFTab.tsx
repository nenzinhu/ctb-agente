'use client';

import { useState } from 'react';
import { baixarArquivo } from '@/lib/download';
import {
  SECOES_LABELS,
  SECOES_PADRAO,
  THEMES,
  type SecoesDossie,
} from '@/lib/pdf/themes';
import Icone from './ui/Icone';

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
      baixarArquivo(await resposta.blob(), `ctb-${temaId}.pdf`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido ao gerar o PDF.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div>
      <p className="eyebrow">Ferramenta</p>
      <h1 className="page-title">Gerar Dossiê em PDF</h1>
      <p className="page-lead">
        Escolha um tema e as seções para gerar um dossiê com normas, enquadramentos e procedimentos.
      </p>

      <div className="card card-pad mt-6 space-y-6">
        <div>
          <label htmlFor="tema" className="label">
            Tema
          </label>
          <select id="tema" value={temaId} onChange={(e) => setTemaId(e.target.value)} className="input">
            {THEMES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {tema?.artigo && (
            <p className="hint">
              Âncora legal: {tema.artigo} · códigos MBFT {tema.codigos.join(', ')}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="label">Seções do dossiê</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(SECOES_LABELS) as (keyof SecoesDossie)[]).map((chave) => (
              <label
                key={chave}
                className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  secoes[chave] ? 'border-brand/40 bg-brand-soft/50 text-ink' : 'border-line text-muted hover:bg-surface-2'
                }`}
              >
                <input
                  type="checkbox"
                  checked={secoes[chave]}
                  onChange={() => alternarSecao(chave)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]"
                />
                <span>{SECOES_LABELS[chave]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="alert-info">
          <Icone nome="info" className="mt-0.5 shrink-0 text-info" />
          <p>
            O dossiê inclui normas literais, cartões de enquadramento, checklist do AIT, exemplos ilustrativos e
            jurisprudência cadastrada. Projetos de lei entram sempre marcados como <strong>PROPOSTA</strong>, nunca como
            lei vigente.
          </p>
        </div>

        {erro && (
          <div className="alert-error" role="alert">
            <Icone nome="alerta" className="mt-0.5 shrink-0 text-danger" />
            <p>{erro}</p>
          </div>
        )}

        {cache && !erro && (
          <p className="flex items-center gap-1.5 text-sm text-success" role="status">
            <Icone nome="check" tamanho={16} />
            {cache === 'HIT' ? 'Dossiê entregue do cache' : 'Dossiê gerado agora'}
          </p>
        )}

        <button type="button" onClick={gerar} disabled={carregando || !temaId} className="btn-primary w-full text-base">
          <Icone nome="download" tamanho={18} />
          {carregando ? 'Gerando dossiê…' : 'Baixar PDF'}
        </button>
      </div>
    </div>
  );
}
