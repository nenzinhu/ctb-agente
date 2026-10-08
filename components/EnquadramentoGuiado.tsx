'use client';

import { useState } from 'react';
import type { RespostaGuiada, RespostasGuiadas, ResultadoGuiado } from '@/lib/mbft/enquadramento-guiado';
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
    setErro(null);
  };

  const pergunta = resultado?.perguntas[0];

  return (
    <div className="space-y-5">
      <SectionCard titulo="Descrever a situação" icone="lista" className="consultation-card">
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
              placeholder="Ex: O condutor dirigia digitando uma mensagem no telefone celular"
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
        <SectionCard titulo="Confirme o que foi observado" icone="check">
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
        <section aria-labelledby="candidatos-guiados" className="space-y-4">
          <div className="rounded-control border border-ds-line bg-ds-surface p-4">
            <h2 id="candidatos-guiados" className="flex items-center gap-2 font-semibold text-ds-text"><Icone nome="alerta" tamanho={18} /> Enquadramentos para conferência</h2>
            <p className="mt-1 text-sm text-ds-subtle">O assistente não seleciona automaticamente uma infração. Compare as fichas e confirme todos os elementos oficiais.</p>
          </div>
          {resultado.candidatos.length === 0 ? (
            <div className="empty-state"><p className="font-semibold">Nenhuma ficha compatível encontrada.</p><p className="mt-1 text-sm">Revise a descrição ou confira o código informado.</p></div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {resultado.candidatos.map(({ ficha, evidenciasFavoraveis, evidenciasContrarias }) => (
                <article key={ficha.codigo} className="card card-pad min-w-0">
                  <p className="font-mono text-lg font-bold text-ds-primary">{ficha.codigo}</p>
                  <h3 className="mt-1 font-semibold text-ds-text">{ficha.tipificacaoResumida}</h3>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div><dt className="font-semibold text-ds-subtle">Amparo legal</dt><dd>{ficha.amparoLegal}</dd></div>
                    <div><dt className="font-semibold text-ds-subtle">Gravidade · penalidade</dt><dd>{ficha.gravidade} · {ficha.penalidade}</dd></div>
                    <div><dt className="font-semibold text-ds-subtle">Constatação</dt><dd>{ficha.constatacao}</dd></div>
                  </dl>
                  {evidenciasFavoraveis.length > 0 && <p className="mt-4 text-sm text-ds-text"><strong>Compatível:</strong> {evidenciasFavoraveis.join(' ')}</p>}
                  {evidenciasContrarias.length > 0 && <p className="mt-3 text-sm text-ds-danger"><strong>Divergência:</strong> {evidenciasContrarias.join(' ')}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
