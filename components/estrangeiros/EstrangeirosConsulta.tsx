'use client';

import { useState } from 'react';
import { interpretarConsultaEstrangeiros } from '@/lib/estrangeiros/consulta';
import { avaliarEstrangeiro } from '@/lib/estrangeiros/motor';
import type { FatosEstrangeiros, ResultadoEstrangeiros } from '@/lib/estrangeiros/types';
import Resultado from './ResultadoEstrangeiros';

const PAISES = [
  ['AR', 'Argentina'], ['BO', 'Bolívia'], ['CL', 'Chile'], ['PY', 'Paraguai'], ['PE', 'Peru'], ['UY', 'Uruguai'], ['OUTRO', 'Outro país'],
] as const;

export default function EstrangeirosConsulta() {
  const [pergunta, setPergunta] = useState('');
  const [fatos, setFatos] = useState<FatosEstrangeiros>({});
  const [resultado, setResultado] = useState<ResultadoEstrangeiros | null>(null);
  const atualizar = <K extends keyof FatosEstrangeiros>(campo: K, valor: FatosEstrangeiros[K]) => setFatos((atual) => ({ ...atual, [campo]: valor }));

  const interpretar = () => {
    const reconhecidos = interpretarConsultaEstrangeiros(pergunta);
    const combinados = { ...fatos, ...reconhecidos };
    setFatos(combinados);
    setResultado(avaliarEstrangeiro(combinados));
  };

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Consulta rápida</h2>
        <p className="mt-1 text-sm text-ds-subtle">Use frases como “argentino com carteira vencida” ou “carro paraguaio sem seguro”.</p>
        <label htmlFor="consulta-estrangeiros" className="mt-4 block text-sm font-medium">Descreva a situação</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input id="consulta-estrangeiros" value={pergunta} onChange={(evento) => setPergunta(evento.target.value)} maxLength={500} className="input flex-1" placeholder="Ex.: uruguaio, PID sem carteira e veículo estrangeiro" />
          <button type="button" className="btn-primary" onClick={interpretar} disabled={!pergunta.trim()}>Interpretar consulta</button>
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
        <button type="button" className="btn-primary mt-5" onClick={() => setResultado(avaliarEstrangeiro(fatos))}>Analisar situação</button>
      </section>
      {resultado && <Resultado resultado={resultado} />}
    </div>
  );
}
