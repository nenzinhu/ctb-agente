'use client';

import { useEffect, useRef, useState } from 'react';
import { requestJson, RequestError } from '@/lib/client/request';
import { interpretarConsultaEstrangeiros } from '@/lib/estrangeiros/consulta';
import { avaliarEstrangeiro } from '@/lib/estrangeiros/motor';
import type { FatosEstrangeiros, ResultadoEstrangeiros } from '@/lib/estrangeiros/types';
import Resultado from './ResultadoEstrangeiros';
import { FONTES_ESTRANGEIROS, buscarTrechosEstrangeiros } from '@/lib/estrangeiros/acervo';

const PAISES = [
  ['AR', 'Argentina'], ['BO', 'Bolívia'], ['CL', 'Chile'], ['PY', 'Paraguai'], ['PE', 'Peru'], ['UY', 'Uruguai'], ['OUTRO', 'Outro país'],
] as const;

export default function EstrangeirosConsulta() {
  const [pergunta, setPergunta] = useState('');
  const [fatos, setFatos] = useState<FatosEstrangeiros>({});
  const [resultado, setResultado] = useState<ResultadoEstrangeiros | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const requisicao = useRef<AbortController | null>(null);
  useEffect(() => () => requisicao.current?.abort(), []);
  const atualizar = <K extends keyof FatosEstrangeiros>(campo: K, valor: FatosEstrangeiros[K]) => setFatos((atual) => ({ ...atual, [campo]: valor }));

  const interpretar = async () => {
    if (consultando || pergunta.trim().length < 2) return;
    const controller = new AbortController();
    requisicao.current = controller;
    setErro(null);
    setResultado(null);
    const reconhecidos = interpretarConsultaEstrangeiros(pergunta);
    const combinados = { ...fatos, ...reconhecidos };
    setFatos(combinados);
    setConsultando(true);
    try {
      const resposta = await requestJson<ResultadoEstrangeiros>('/api/estrangeiros/consultar', {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta, fatos: combinados }),
      });
      if (!resposta || !resposta.fatos || !Array.isArray(resposta.infracoes) || !Array.isArray(resposta.documentos) || !Array.isArray(resposta.perguntasPendentes) || !Array.isArray(resposta.providencias) || !Array.isArray(resposta.fontes) || typeof resposta.aviso !== 'string') {
        throw new RequestError('invalid-response', 'O serviço retornou uma resposta inválida.');
      }
      if (!controller.signal.aborted) setResultado(resposta);
    } catch (error) {
      if (controller.signal.aborted) return;
      setErro(error instanceof Error ? error.message : 'Não foi possível consultar o serviço.');
      setResultado({ ...avaliarEstrangeiro(combinados), trechos: buscarTrechosEstrangeiros(pergunta) });
    } finally {
      if (!controller.signal.aborted) setConsultando(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Consulta rápida</h2>
        <p className="mt-1 text-sm text-ds-subtle">Use frases como “argentino com carteira vencida” ou “carro paraguaio sem seguro”.</p>
        <label htmlFor="consulta-estrangeiros" className="mt-4 block text-sm font-medium">Descreva a situação</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input id="consulta-estrangeiros" value={pergunta} onChange={(evento) => setPergunta(evento.target.value)} maxLength={500} className="input flex-1" placeholder="Ex.: uruguaio, PID sem carteira e veículo estrangeiro" />
          <button type="button" className="btn-primary" onClick={interpretar} disabled={pergunta.trim().length < 2 || consultando}>{consultando ? 'Consultando…' : 'Interpretar consulta'}</button>
        </div>
      </section>

      {consultando && <p role="status" className="text-sm text-ds-subtle">Consultando o serviço. A espera é limitada a 15 segundos.</p>}
      {erro && <div role="alert" className="rounded-card border border-amber-300 p-4 text-sm"><p>{erro}</p><p className="mt-2">Exibindo análise local com as regras e os trechos já incorporados ao aplicativo. A recuperação complementar do serviço não foi concluída. Confira os documentos abaixo.</p><button type="button" className="btn-secondary mt-3" onClick={() => void interpretar()} disabled={consultando}>Tentar novamente</button></div>}
      <section className="card p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Documentos de origem anexados</h2>
        <p className="mt-1 text-sm text-ds-subtle">A consulta recupera trechos destes documentos e mostra artigo, página e origem para conferência humana.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FONTES_ESTRANGEIROS.map((fonte) => (
            <article key={fonte.id} className="rounded-card border border-ds-line p-4">
              <a className="font-semibold text-ds-ink underline-offset-4 hover:underline" href={fonte.arquivo} target="_blank" rel="noreferrer">{fonte.titulo}</a>
              <p className="mt-1 text-xs text-ds-subtle">{fonte.orgao} · {fonte.versao}</p>
              <p className="mt-2 text-xs text-ds-subtle">Conferência registrada no acervo: {new Date(`${fonte.conferidoEm}T00:00:00`).toLocaleDateString('pt-BR')}. Não equivale a confirmação de vigência.</p>
              {fonte.situacao === 'revisar' && <p className="mt-2 text-xs font-medium text-ds-warn">Situação no acervo: requer revisão.</p>}
              {fonte.urlOficial ? (
                <a className="mt-2 inline-block text-xs text-ds-ink underline" href={fonte.urlOficial} target="_blank" rel="noreferrer">Consultar publicação oficial</a>
              ) : (
                <p className="mt-2 text-xs font-medium text-ds-warn">Pendente de confirmação em fonte oficial</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Fiscalização guiada</h2>
        <p className="mt-1 text-sm text-ds-subtle">Informe apenas os fatos necessários. Não digite nome, placa ou número de documento.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium">País emissor da habilitação
            <select className="input mt-1" value={fatos.paisHabilitacao ?? ''} onChange={(e) => atualizar('paisHabilitacao', e.target.value || undefined)}><option value="">Selecione</option>{PAISES.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select>
          </label>
          <label className="text-sm font-medium">Situação no Brasil
            <select className="input mt-1" value={fatos.visitanteOuResidente ?? ''} onChange={(e) => atualizar('visitanteOuResidente', (e.target.value || undefined) as FatosEstrangeiros['visitanteOuResidente'])}><option value="">Selecione</option><option value="visitante">Visitante</option><option value="residente">Residente</option></select>
          </label>
          <label className="text-sm font-medium">Data de entrada no Brasil
            <input type="date" className="input mt-1" value={fatos.dataEntrada ?? ''} onChange={(e) => atualizar('dataEntrada', e.target.value || undefined)} />
          </label>
          <label className="text-sm font-medium">Habilitação estrangeira
            <select className="input mt-1" value={fatos.habilitacao ?? ''} onChange={(e) => atualizar('habilitacao', (e.target.value || undefined) as FatosEstrangeiros['habilitacao'])}><option value="">Selecione</option><option value="valida">Válida</option><option value="vencida">Vencida</option><option value="nao_apresentada">Não apresentada</option></select>
          </label>
          <label className="text-sm font-medium">Documento de identificação
            <select className="input mt-1" value={fatos.identidadeApresentada === undefined ? '' : String(fatos.identidadeApresentada)} onChange={(e) => atualizar('identidadeApresentada', e.target.value === '' ? undefined : e.target.value === 'true')}><option value="">Selecione</option><option value="true">Apresentado</option><option value="false">Não apresentado</option></select>
          </label>
          <label className="text-sm font-medium">Categoria compatível com o veículo
            <select className="input mt-1" value={fatos.categoriaCompativel === undefined ? '' : String(fatos.categoriaCompativel)} onChange={(e) => atualizar('categoriaCompativel', e.target.value === '' ? undefined : e.target.value === 'true')}><option value="">Selecione</option><option value="true">Sim</option><option value="false">Não</option></select>
          </label>
          <label className="text-sm font-medium">Registro do veículo
            <select className="input mt-1" value={fatos.registroVeiculo ?? ''} onChange={(e) => atualizar('registroVeiculo', (e.target.value || undefined) as FatosEstrangeiros['registroVeiculo'])}><option value="">Selecione</option><option value="brasileiro">Brasileiro</option><option value="estrangeiro">Estrangeiro</option></select>
          </label>
          <label className="flex items-center gap-2 self-end rounded-control border border-ds-line p-3 text-sm"><input type="checkbox" checked={fatos.pidApresentada ?? false} onChange={(e) => atualizar('pidApresentada', e.target.checked)} /> PID apresentada</label>
        </div>
        <button type="button" className="btn-primary mt-5" disabled={consultando} onClick={() => { setErro(null); setResultado(avaliarEstrangeiro(fatos)); }}>Analisar situação</button>
      </section>
      {resultado && <Resultado resultado={resultado} />}
    </div>
  );
}
