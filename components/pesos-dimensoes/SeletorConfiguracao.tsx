'use client';

import { useEffect, useRef, useState } from 'react';

import { listarConfiguracoes, obterConfiguracao } from '@/lib/pesos-dimensoes/catalogo';
import type { GrupoEixo, TipoGrupoEixo } from '@/lib/pesos-dimensoes/types';
import DesenhoVeiculo from './DesenhoVeiculo';

interface Props {
  valor: string;
  onChange: (id: string) => void;
}

const configuracoes = listarConfiguracoes();

const NOMES_TIPO_EIXO: Record<TipoGrupoEixo, string> = {
  'isolado-2-pneus': 'isolado, 2 pneus',
  'isolado-4-pneus': 'isolado, 4 pneus',
  'direcional-duplo': 'direcionais, 2 pneus por eixo',
  'tandem-duplo': 'tandem duplo',
  'tandem-triplo': 'tandem triplo',
  distanciado: 'eixo distanciado',
  'conforme-aet': 'conforme AET',
};

function descricaoGrupoEixo(grupo: GrupoEixo, primeiroEixo: number): string {
  const ultimoEixo = primeiroEixo + grupo.quantidadeEixos - 1;
  const eixos = primeiroEixo === ultimoEixo ? `E${primeiroEixo}` : `E${primeiroEixo}–E${ultimoEixo}`;
  const limite = grupo.limiteKg === null ? 'limite conforme AET' : `${grupo.limiteKg.toLocaleString('pt-BR')} kg`;
  return `${eixos} · ${grupo.nome} · ${NOMES_TIPO_EIXO[grupo.tipo]} · ${limite}`;
}

function pbtMaximo(limiteKg: number | null): string {
  return limiteKg === null ? 'PBT/PBTC máximo: conforme AET' : `PBT/PBTC máximo: ${limiteKg.toLocaleString('pt-BR')} kg`;
}

export default function SeletorConfiguracao({ valor, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const opcoesRef = useRef<Array<HTMLButtonElement | null>>([]);
  const selecionada = obterConfiguracao(valor) ?? configuracoes[0];
  const indiceSelecionado = Math.max(0, configuracoes.findIndex((item) => item.id === selecionada.id));

  useEffect(() => {
    if (aberto) opcoesRef.current[indiceSelecionado]?.focus();
  }, [aberto, indiceSelecionado]);

  const fechar = () => {
    setAberto(false);
    gatilhoRef.current?.focus();
  };

  const aoTeclado = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === 'Escape' && aberto) {
      evento.preventDefault();
      fechar();
      return;
    }
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;
    evento.preventDefault();
    if (!aberto) {
      setAberto(true);
      return;
    }
    const atual = opcoesRef.current.findIndex((elemento) => elemento === document.activeElement);
    const direcao = evento.key === 'ArrowDown' ? 1 : -1;
    const proximo = (Math.max(0, atual) + direcao + configuracoes.length) % configuracoes.length;
    opcoesRef.current[proximo]?.focus();
  };

  return (
    <div className="relative" onKeyDown={aoTeclado}>
      <button
        ref={gatilhoRef}
        type="button"
        aria-label="Selecionar configuração do veículo"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((estado) => !estado)}
        className="flex min-h-24 w-full items-center gap-3 rounded-control border-2 border-ds-border bg-ds-surface px-3 py-2 text-left shadow-sm transition hover:border-ds-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-primary"
      >
        <DesenhoVeiculo configuracao={selecionada} compacto />
        <span className="min-w-0 flex-1">
          <span className="mb-1 inline-flex rounded bg-ds-primary px-2 py-0.5 font-mono text-xs font-bold text-white">{selecionada.codigo}</span>
          <strong className="block text-sm text-ds-text">{selecionada.nome}</strong>
          <small className="mt-1 block text-xs text-ds-subtle">
            {selecionada.quantidadeEixos} eixos · {selecionada.requerAet ? 'AET obrigatória' : 'configuração comum'}
          </small>
          <small className="mt-1 block text-xs text-ds-subtle">Conhecido como: {selecionada.apelidos.join(', ')}</small>
          <small className="mt-1 block text-xs font-semibold text-ds-primary">{pbtMaximo(selecionada.limiteTotalKg)}</small>
        </span>
        <span aria-hidden="true" className={`text-ds-primary transition ${aberto ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {aberto && (
        <div
          role="listbox"
          aria-label="Configurações de veículo"
          className="absolute z-30 mt-2 max-h-[60vh] w-full overflow-y-auto rounded-control border-2 border-ds-border bg-ds-surface p-2 shadow-xl"
        >
          {configuracoes.map((configuracao, indice) => (
            <button
              key={configuracao.id}
              ref={(elemento) => { opcoesRef.current[indice] = elemento; }}
              type="button"
              role="option"
              aria-selected={configuracao.id === valor}
              onClick={() => {
                onChange(configuracao.id);
                fechar();
              }}
              className="mb-1 flex min-h-24 w-full items-center gap-3 rounded-control border border-transparent px-2 py-2 text-left last:mb-0 hover:border-ds-primary hover:bg-ds-soft focus-visible:border-ds-primary focus-visible:bg-ds-soft focus-visible:outline-none aria-selected:border-ds-accent aria-selected:bg-ds-accent/10"
            >
              <DesenhoVeiculo configuracao={configuracao} compacto />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-ds-text">{configuracao.nome}</strong>
                <small className="block text-xs text-ds-subtle">
                  <span className="mr-1 font-mono font-bold text-ds-primary">{configuracao.codigo}</span>
                  · {configuracao.quantidadeEixos} eixos · {configuracao.unidades} {configuracao.unidades === 1 ? 'unidade' : 'unidades'}
                </small>
                <small className="block text-xs text-ds-subtle">{configuracao.apelidos.join(', ')}</small>
                <small className="block text-xs font-semibold text-ds-primary">{pbtMaximo(configuracao.limiteTotalKg)}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 rounded-control border border-ds-line bg-ds-soft/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ds-primary">Identificação dos eixos</p>
        <ul className="mt-2 grid gap-1.5 text-xs text-ds-text sm:grid-cols-2">
          {selecionada.gruposEixo.map((grupo, indice) => {
            const primeiroEixo = 1 + selecionada.gruposEixo
              .slice(0, indice)
              .reduce((total, anterior) => total + anterior.quantidadeEixos, 0);
            const descricao = descricaoGrupoEixo(grupo, primeiroEixo);
            return <li key={grupo.id} className="rounded-md bg-ds-surface px-2.5 py-2">{descricao}</li>;
          })}
        </ul>
      </div>
    </div>
  );
}
