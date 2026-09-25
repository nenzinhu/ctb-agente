'use client';

import { useState } from 'react';
import { baixarArquivo } from '@/lib/download';
import {
  SECOES_LABELS,
  SECOES_PADRAO,
  THEMES,
  type SecoesDossie,
} from '@/lib/pdf/themes';
import Field from './ui/Field';
import Icone from './ui/Icone';
import PrimaryButton from './ui/PrimaryButton';
import SectionCard from './ui/SectionCard';
import Stepper, { type Etapa } from './ui/Stepper';
import TitleCard from './ui/TitleCard';
import { cx } from './ui/cx';

const ETAPAS: Etapa[] = [
  { id: 'tema', rotulo: 'Tema' },
  { id: 'secoes', rotulo: 'Seções' },
  { id: 'download', rotulo: 'Download' },
];

export default function GerarPDFTab() {
  const [temaId, setTemaId] = useState(THEMES[0]?.id ?? '');
  const [secoes, setSecoes] = useState<SecoesDossie>({ ...SECOES_PADRAO, projetosDeLei: true });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cache, setCache] = useState<'HIT' | 'MISS' | null>(null);

  const tema = THEMES.find((t) => t.id === temaId);
  const algumaSecao = Object.values(secoes).some(Boolean);
  // The first step still to do; all three are done once the PDF was downloaded.
  const etapaAtual = !temaId ? 0 : !algumaSecao ? 1 : cache ? ETAPAS.length : 2;

  const escolherTema = (id: string) => {
    setTemaId(id);
    setCache(null);
  };

  const alternarSecao = (chave: keyof SecoesDossie) => {
    setSecoes((atual) => ({ ...atual, [chave]: !atual[chave] }));
    setCache(null);
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
    <div className="space-y-6">
      <TitleCard
        titulo="Gerar Dossiê em PDF"
        icone="arquivo"
        subtitulo="Escolha um tema e as seções para gerar um dossiê com normas, enquadramentos e procedimentos."
      />

      <Stepper etapas={ETAPAS} atual={etapaAtual} rotulo="Etapas do dossiê" />

      <SectionCard numero={1} titulo="Tema">
        <Field
          as="select"
          id="tema"
          label="Tema"
          value={temaId}
          onChange={(e) => escolherTema(e.target.value)}
          hint={tema?.artigo ? `Âncora legal: ${tema.artigo} · códigos MBFT ${tema.codigos.join(', ')}` : undefined}
        >
          {THEMES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Field>
      </SectionCard>

      <SectionCard numero={2} titulo="Seções">
        <fieldset aria-describedby={algumaSecao ? undefined : 'secoes-dica'}>
          <legend className="sr-only">Seções do dossiê</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(SECOES_LABELS) as (keyof SecoesDossie)[]).map((chave) => (
              <label
                key={chave}
                className={cx(
                  'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-control border-2 px-3 py-2.5 text-sm transition-colors',
                  secoes[chave]
                    ? 'border-ds-primary bg-ds-primary-soft text-ds-text'
                    : 'border-ds-line text-ds-subtle hover:bg-ds-muted'
                )}
              >
                <input
                  type="checkbox"
                  checked={secoes[chave]}
                  onChange={() => alternarSecao(chave)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-ds-primary"
                />
                <span>{SECOES_LABELS[chave]}</span>
              </label>
            ))}
          </div>
          {!algumaSecao && (
            <p id="secoes-dica" className="hint">
              Marque ao menos uma seção.
            </p>
          )}
        </fieldset>
      </SectionCard>

      <SectionCard numero={3} titulo="Download">
        <div className="space-y-4">
          <div className="alert-info">
            <Icone nome="info" className="mt-0.5 shrink-0 text-ds-ink" />
            <p>
              O dossiê inclui normas literais, cartões de enquadramento, checklist do AIT, exemplos ilustrativos e
              jurisprudência cadastrada. Projetos de lei entram sempre marcados como <strong>PROPOSTA</strong>, nunca como
              lei vigente.
            </p>
          </div>

          {erro && (
            <div className="alert-error" role="alert">
              <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-danger" />
              <p>{erro}</p>
            </div>
          )}

          {cache && !erro && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ds-success" role="status">
              <Icone nome="check" tamanho={16} />
              {cache === 'HIT' ? 'Dossiê entregue do cache' : 'Dossiê gerado agora'}
            </p>
          )}

          <PrimaryButton
            icone="download"
            carregando={carregando}
            textoCarregando="Gerando dossiê…"
            disabled={!temaId || !algumaSecao}
            onClick={gerar}
            className="w-full text-base"
          >
            Baixar PDF
          </PrimaryButton>
        </div>
      </SectionCard>
    </div>
  );
}
