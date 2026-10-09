import type { ConfiguracaoVeiculo } from '@/lib/pesos-dimensoes/types';

interface Props {
  configuracao: ConfiguracaoVeiculo;
  compacto?: boolean;
}

export default function DesenhoVeiculo({ configuracao, compacto = false }: Props) {
  const largura = 260;
  const margem = 8;
  const espaco = 5;
  const larguraUtil = largura - margem * 2 - espaco * (configuracao.unidades - 1);
  const larguraUnidade = larguraUtil / configuracao.unidades;
  const inicioEixos = margem + 20;
  const fimEixos = largura - margem - 18;
  const passoEixos = configuracao.quantidadeEixos > 1
    ? (fimEixos - inicioEixos) / (configuracao.quantidadeEixos - 1)
    : 0;

  return (
    <svg
      viewBox="0 0 260 84"
      className={compacto ? 'h-12 w-40' : 'h-20 w-full max-w-[260px]'}
      role="img"
      aria-label={`${configuracao.nome}: ${configuracao.quantidadeEixos} eixos e ${configuracao.unidades} ${configuracao.unidades === 1 ? 'unidade' : 'unidades'}`}
    >
      <title>{configuracao.nome}</title>
      {Array.from({ length: configuracao.unidades }, (_, indice) => {
        const x = margem + indice * (larguraUnidade + espaco);
        const primeira = indice === 0;
        return (
          <g key={indice} data-unidade="true">
            {primeira ? (
              <path
                d={`M ${x} 53 L ${x} 30 Q ${x} 22 ${x + 8} 22 H ${x + larguraUnidade * 0.55} L ${x + larguraUnidade * 0.72} 34 H ${x + larguraUnidade} V 53 Z`}
                className="fill-ds-primary/15 stroke-ds-primary"
                strokeWidth="2"
              />
            ) : (
              <rect
                x={x}
                y="25"
                width={larguraUnidade}
                height="28"
                rx="4"
                className="fill-ds-accent/15 stroke-ds-primary"
                strokeWidth="2"
              />
            )}
            {indice > 0 && <line x1={x - espaco} y1="48" x2={x} y2="48" className="stroke-ds-subtle" strokeWidth="2" />}
          </g>
        );
      })}
      <line x1="8" y1="58" x2="252" y2="58" className="stroke-ds-line" strokeWidth="2" />
      {Array.from({ length: configuracao.quantidadeEixos }, (_, indice) => {
        const x = inicioEixos + indice * passoEixos;
        return (
          <g key={indice} data-eixo="true">
            <line x1={x} y1="48" x2={x} y2="61" className="stroke-ds-text" strokeWidth="2" />
            <circle cx={x} cy="64" r="7" className="fill-ds-surface stroke-ds-text" strokeWidth="3" />
            <circle cx={x} cy="64" r="2" className="fill-ds-accent" />
          </g>
        );
      })}
    </svg>
  );
}
