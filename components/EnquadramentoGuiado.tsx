'use client';

import { useState } from 'react';
import {
  type RespostaGuiada,
  type RespostasGuiadas,
  type ResultadoGuiado,
} from '@/lib/mbft/enquadramento-guiado';
import { montarFundamentoAtuacao } from '@/lib/mbft/fundamento-atuacao';
import { compartilharTexto } from '@/lib/share/send';
import BotaoVoz, { AvisoVoz, useDitado } from './BotaoVoz';
import ConsultaModes from './ConsultaModes';
import Field from './ui/Field';
import Icone from './ui/Icone';
import PrimaryButton from './ui/PrimaryButton';
import SectionCard from './ui/SectionCard';

export default function EnquadramentoGuiado() {
  const [descricao, setDescricao] = useState('');
  const [respostas, setRespostas] = useState<RespostasGuiadas>({});
  const [resultado, setResultado] = useState<ResultadoGuiado | null>(null);
  const [codigoSelecionado, setCodigoSelecionado] = useState<string | null>(null);
  const [avisoAcao, setAvisoAcao] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ditado = useDitado({ onTranscricao: (texto) => setDescricao((atual) => atual ? `${atual} ${texto}` : texto) });

  const analisar = async (novasRespostas = respostas) => {
    if (descricao.trim().length < 3 || carregando) return;
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch('/api/enquadramento-guiado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: descricao.trim(), respostas: novasRespostas }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Não foi possível analisar a situação.');
      setResultado(body as ResultadoGuiado);
      setCodigoSelecionado(null);
      setAvisoAcao(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível analisar a situação.');
    } finally {
      setCarregando(false);
    }
  };

  const responder = (id: string, resposta: RespostaGuiada) => {
    const atualizadas = { ...respostas, [id]: resposta };
    setRespostas(atualizadas);
    void analisar(atualizadas);
  };

  const reiniciar = () => {
    setDescricao('');
    setRespostas({});
    setResultado(null);
    setCodigoSelecionado(null);
    setAvisoAcao(null);
    setErro(null);
  };

  const pergunta = resultado?.perguntas[0];
  const candidatoSelecionado = resultado?.candidatos.find(({ ficha }) => ficha.codigo === codigoSelecionado);
  const fundamento = candidatoSelecionado
    ? montarFundamentoAtuacao(candidatoSelecionado.ficha, {
        evidencias: candidatoSelecionado.evidencias ?? [],
        pendentes: resultado?.perguntas
          .filter((perguntaPendente) => perguntaPendente.codigos.includes(candidatoSelecionado.ficha.codigo))
          .map(({ criterio, fonte }) => ({ criterio, fonte })) ?? [],
      })
    : null;

  const copiarFundamento = async () => {
    if (!fundamento || typeof navigator.clipboard?.writeText !== 'function') {
      setAvisoAcao('A cópia não está disponível neste navegador.');
      return;
    }
    try {
      await navigator.clipboard.writeText(fundamento.texto);
      setAvisoAcao('Fundamento copiado.');
    } catch {
      setAvisoAcao('Não foi possível copiar o fundamento.');
    }
  };

  const compartilharFundamento = async () => {
    if (!fundamento) return;
    const resultadoCompartilhamento = await compartilharTexto(fundamento.texto, `Fundamento MBFT ${fundamento.codigo}`);
    setAvisoAcao(resultadoCompartilhamento === 'compartilhado'
      ? 'Fundamento compartilhado.'
      : resultadoCompartilhamento === 'copiado'
        ? 'Fundamento copiado.'
        : resultadoCompartilhamento === 'cancelado'
          ? null
          : 'Não foi possível compartilhar o fundamento.');
  };

  return (
    <div className="space-y-5">
      <SectionCard titulo="Descrever a situação" icone="lista" className="consultation-card print:hidden">
        <ConsultaModes atual="guiado" />
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void analisar(); }}>
          <div>
            <Field
              as="textarea"
              label="Descreva a situação observada"
              value={descricao}
              onChange={(event) => { setDescricao(event.target.value); setErro(null); }}
              rows={5}
              maxLength={1000}
              placeholder="Ex.: O condutor dirigia digitando uma mensagem no telefone celular"
              hint="Não informe placa, CPF, nome ou outros dados pessoais. Você também pode digitar o código MBFT completo."
              erro={erro}
              acao={<BotaoVoz ditado={ditado} />}
              controlClassName="min-h-[140px] resize-y leading-relaxed"
            />
            <AvisoVoz ditado={ditado} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton type="submit" icone="busca" carregando={carregando} textoCarregando="Analisando…" disabled={descricao.trim().length < 3} className="flex-1">
              Analisar situação
            </PrimaryButton>
            {resultado && <button type="button" className="btn-secondary" onClick={reiniciar}>Nova análise</button>}
          </div>
        </form>
      </SectionCard>

      {pergunta && (
        <SectionCard titulo="Confirme o que foi observado" icone="check" className="print:hidden">
          <p className="text-base font-semibold text-ds-text">{pergunta.texto}</p>
          <p className="mt-2 text-sm text-ds-subtle">Critério extraído da ficha oficial MBFT. Se não houver certeza, marque “Não informado”.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {([['sim', 'Sim'], ['nao', 'Não'], ['nao_informado', 'Não informado']] as const).map(([valor, rotulo]) => (
              <button key={valor} type="button" className="chip" disabled={carregando} onClick={() => responder(pergunta.id, valor)}>{rotulo}</button>
            ))}
          </div>
        </SectionCard>
      )}

      {resultado && (
        <section aria-labelledby="candidatos-guiados" className="space-y-4 print:hidden">
          <div className="rounded-control border border-ds-line bg-ds-surface p-4">
            <h2 id="candidatos-guiados" className="flex items-center gap-2 font-semibold text-ds-text"><Icone nome="alerta" tamanho={18} /> Enquadramentos para conferência</h2>
            <p className="mt-1 text-sm text-ds-subtle">O assistente não seleciona automaticamente uma infração. Compare as fichas e confirme todos os elementos oficiais.</p>
          </div>
          {resultado.candidatos.length === 0 ? (
            <div className="empty-state"><p className="font-semibold">Nenhuma ficha compatível encontrada.</p><p className="mt-1 text-sm">Revise a descrição ou confira o código informado.</p></div>
          ) : (
            <div className="space-y-3" aria-label="Comparação entre infrações">
              {resultado.candidatos.map(({ ficha, evidencias = [] }) => {
                const favoraveis = evidencias.filter((evidencia) => evidencia.efeito === 'favoravel');
                const contrarias = evidencias.filter((evidencia) => evidencia.efeito === 'contraria');
                return (
                <article key={ficha.codigo} className={`card card-pad min-w-0 ${codigoSelecionado === ficha.codigo ? 'ring-2 ring-ds-primary' : ''}`}>
                  <div className="grid gap-4 lg:grid-cols-[minmax(13rem,0.8fr)_minmax(0,2fr)_auto] lg:items-start">
                    <div>
                      <p className="font-mono text-lg font-bold text-ds-primary">{ficha.codigo}</p>
                      <h3 className="mt-1 font-semibold text-ds-text">{ficha.tipificacaoResumida}</h3>
                      <p className="mt-2 text-xs text-ds-subtle">{ficha.amparoLegal}</p>
                    </div>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                      <div><dt className="font-semibold text-ds-subtle">Elemento diferenciador</dt><dd>{ficha.quandoAutuar?.[0] || ficha.tipificacao || ficha.tipificacaoResumida}</dd></div>
                      <div><dt className="font-semibold text-ds-subtle">Responsável</dt><dd>{ficha.infrator || '—'}</dd></div>
                      <div><dt className="font-semibold text-ds-subtle">Gravidade · pontos</dt><dd>{ficha.gravidade} · {ficha.pontuacao}</dd></div>
                      <div><dt className="font-semibold text-ds-subtle">Penalidade</dt><dd>{ficha.penalidade || '—'}</dd></div>
                      <div><dt className="font-semibold text-ds-subtle">Medida administrativa</dt><dd>{ficha.medidaAdministrativa || '—'}</dd></div>
                      <div><dt className="font-semibold text-ds-subtle">Constatação</dt><dd>{ficha.constatacao || '—'}</dd></div>
                    </dl>
                    <button
                      type="button"
                      className={codigoSelecionado === ficha.codigo ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
                      onClick={() => { setCodigoSelecionado(ficha.codigo); setAvisoAcao(null); }}
                    >
                      {codigoSelecionado === ficha.codigo ? 'Selecionada' : `Selecionar ${ficha.codigo}`}
                    </button>
                  </div>
                  {favoraveis.length > 0 && <p className="mt-4 text-sm text-ds-text"><strong>Compatível:</strong> {favoraveis.map((evidencia) => evidencia.descricao).join(' ')}</p>}
                  {contrarias.length > 0 && <p className="mt-3 text-sm text-ds-danger"><strong>Divergência:</strong> {contrarias.map((evidencia) => evidencia.descricao).join(' ')}</p>}
                </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {fundamento && (
        <SectionCard titulo="Fundamento da atuação" icone="check" id="fundamento-impressao">
          <div className="alert-warn" role="note">
            <Icone nome="alerta" tamanho={18} className="mt-0.5 shrink-0" />
            <p>Minuta de apoio baseada somente na ficha selecionada. Confira todos os elementos e a norma vigente antes de lavrar o AIT.</p>
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            {[
              ['Fato constatado', fundamento.fatoConstatado],
              ['Código MBFT', fundamento.codigo],
              ['Amparo legal', fundamento.amparoLegal],
              ['Responsável', fundamento.responsavel],
              ['Gravidade · pontos', `${fundamento.gravidade} · ${fundamento.pontuacao}`],
              ['Penalidade', fundamento.penalidade],
              ['Medida administrativa', fundamento.medidaAdministrativa],
              ['Forma de constatação', fundamento.constatacao],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-control border border-ds-line bg-ds-muted p-3">
                <dt className="font-semibold text-ds-subtle">{rotulo}</dt>
                <dd className="mt-1 text-ds-text">{valor || '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="panel p-4"><h3 className="font-semibold">Elementos confirmados</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{fundamento.elementosConfirmados.length ? fundamento.elementosConfirmados.map((item) => <li key={item}>{item}</li>) : <li>Nenhum informado</li>}</ul></div>
            <div className="panel p-4"><h3 className="font-semibold">Ainda precisa confirmar</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{fundamento.elementosAConfirmar.length ? fundamento.elementosAConfirmar.map((item) => <li key={item}>{item}</li>) : <li>Nenhum pendente</li>}</ul></div>
            <div className="panel p-4"><h3 className="font-semibold">Divergências</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{fundamento.divergencias.length ? fundamento.divergencias.map((item) => <li key={item}>{item}</li>) : <li>Nenhuma registrada</li>}</ul></div>
          </div>
          <p className="mt-4 text-sm text-ds-subtle"><strong>Fonte:</strong> {fundamento.fonte}</p>
          <div className="mt-5 flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap">
            <button type="button" className="btn-secondary btn-sm" onClick={() => void copiarFundamento()}>Copiar fundamento</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => void compartilharFundamento()}>Compartilhar fundamento</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => window.print()}>Imprimir fundamento</button>
          </div>
          {avisoAcao && <p className="mt-3 text-sm text-ds-subtle" role="status">{avisoAcao}</p>}
        </SectionCard>
      )}
    </div>
  );
}
