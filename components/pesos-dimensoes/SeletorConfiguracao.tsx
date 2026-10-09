'use client';

import { useEffect, useRef, useState } from 'react';

import { listarConfiguracoes, obterConfiguracao } from '@/lib/pesos-dimensoes/catalogo';
import DesenhoVeiculo from './DesenhoVeiculo';

interface Props {
  valor: string;
  onChange: (id: string) => void;
}

const configuracoes = listarConfiguracoes();

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
        className="flex min-h-20 w-full items-center gap-3 rounded-control border-2 border-ds-border bg-ds-surface px-3 py-2 text-left shadow-sm transition hover:border-ds-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-primary"
      >
        <DesenhoVeiculo configuracao={selecionada} compacto />
        <span className="min-w-0 flex-1">
          <strong className="block text-sm text-ds-text">{selecionada.nome}</strong>
          <small className="mt-1 block text-xs text-ds-subtle">
            {selecionada.quantidadeEixos} eixos · {selecionada.requerAet ? 'AET obrigatória' : 'configuração comum'}
          </small>
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
              className="mb-1 flex min-h-20 w-full items-center gap-3 rounded-control border border-transparent px-2 py-2 text-left last:mb-0 hover:border-ds-primary hover:bg-ds-soft focus-visible:border-ds-primary focus-visible:bg-ds-soft focus-visible:outline-none aria-selected:border-ds-accent aria-selected:bg-ds-accent/10"
            >
              <DesenhoVeiculo configuracao={configuracao} compacto />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-ds-text">{configuracao.nome}</strong>
                <small className="block text-xs text-ds-subtle">
                  {configuracao.quantidadeEixos} eixos · {configuracao.unidades} {configuracao.unidades === 1 ? 'unidade' : 'unidades'}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
