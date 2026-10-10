'use client';

import { useId, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

import type { ConfiguracaoVeiculo, GrupoEixo, TipoGrupoEixo } from '@/lib/pesos-dimensoes/types';

interface Props {
  configuracao: ConfiguracaoVeiculo;
  compacto?: boolean;
}

const POSICOES_EIXOS: Record<string, number[]> = {
  'rigido-2-eixos': [42, 272],
  'truck-3-eixos': [42, 254, 278],
  'bitruck-4-eixos': [42, 66, 254, 278],
  'cavalo-2s2': [42, 91, 259, 284],
  'cavalo-2s3': [42, 91, 246, 269, 292],
  'cavalo-3s2': [42, 78, 99, 258, 283],
  'cavalo-3s3': [42, 78, 99, 246, 269, 292],
  'cavalo-3s4': [42, 78, 99, 218, 246, 269, 292],
  'caminhao-reboque': [42, 112, 134, 246, 269, 292],
  'bitrem-7-eixos': [42, 78, 99, 169, 191, 270, 292],
  'rodotrem-9-eixos-aet': [42, 78, 99, 145, 166, 187, 252, 273, 294],
  'especial-aet': [160],
};

interface EixoDesenho {
  grupo: GrupoEixo;
  tipo: TipoGrupoEixo;
  numero: number;
  x: number;
}

function eixosDaConfiguracao(configuracao: ConfiguracaoVeiculo): EixoDesenho[] {
  const posicoes = POSICOES_EIXOS[configuracao.id] ?? Array.from(
    { length: configuracao.quantidadeEixos },
    (_, indice) => configuracao.quantidadeEixos === 1 ? 160 : 34 + indice * (252 / (configuracao.quantidadeEixos - 1)),
  );
  let numero = 0;
  return configuracao.gruposEixo.flatMap((grupo) => Array.from({ length: grupo.quantidadeEixos }, () => {
    const atual = numero++;
    return { grupo, tipo: grupo.tipo, numero: atual + 1, x: posicoes[atual] ?? 34 + atual * 24 };
  }));
}

function pneusDoEixo(tipo: TipoGrupoEixo): 'simples' | 'duplos' {
  return tipo === 'isolado-2-pneus' || tipo === 'direcional-duplo' ? 'simples' : 'duplos';
}

function limiteCurto(limiteKg: number | null): string {
  if (limiteKg === null) return 'AET';
  return `${(limiteKg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`;
}

function Cabine({ gradiente }: { gradiente: string }) {
  return (
    <g data-elemento="cabine">
      <path d="M12 70V39c0-5 4-9 9-9h27c6 0 11 3 14 8l10 16v16Z" fill={`url(#${gradiente})`} className="stroke-ds-primary" strokeWidth="2" />
      <path data-elemento="parabrisa" d="M45 35h5c4 0 7 2 9 6l6 10H45Z" className="fill-ds-surface/80 stroke-ds-primary" strokeWidth="1.4" />
      <path d="M19 36h20v20H19Z" className="fill-ds-surface/70 stroke-ds-primary" strokeWidth="1.2" />
      <path d="M19 59h21M42 35v35" className="stroke-ds-primary/60" strokeWidth="1" />
      <rect x="13" y="61" width="6" height="5" rx="1" className="fill-ds-accent stroke-ds-gold-strong" strokeWidth="1" />
      <path d="M8 68h8M68 68h10" className="stroke-ds-text" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function Bau({ x, largura, gradiente, indice, marcarUnidade = true }: { x: number; largura: number; gradiente: string; indice: number; marcarUnidade?: boolean }) {
  return (
    <g data-unidade={marcarUnidade ? 'true' : undefined}>
      <rect x={x} y="31" width={largura} height="39" rx="4" fill={`url(#${gradiente})`} className="stroke-ds-primary" strokeWidth="2" />
      <path d={`M${x + 7} 39H${x + largura - 7}M${x + 7} 47H${x + largura - 7}M${x + 7} 55H${x + largura - 7}`} className="stroke-ds-primary/25" strokeWidth="1" />
      <rect x={x + largura - 9} y="34" width="4" height="30" rx="1" className="fill-ds-gold/70" />
      <text x={x + 8} y="44" className="fill-ds-primary font-mono font-bold" fontSize="7">U{indice}</text>
    </g>
  );
}

function CorposVeiculo({ configuracao, gradiente }: { configuracao: ConfiguracaoVeiculo; gradiente: string }) {
  if (configuracao.unidades === 1) {
    return (
      <g data-veiculo-corpo data-unidade="true">
        <Cabine gradiente={gradiente} />
        <Bau x={73} largura={234} gradiente={gradiente} indice={1} marcarUnidade={false} />
      </g>
    );
  }

  if (configuracao.id === 'caminhao-reboque') {
    return (
      <g data-veiculo-corpo>
        <g data-unidade="true">
          <Cabine gradiente={gradiente} />
          <Bau x={73} largura={86} gradiente={gradiente} indice={1} marcarUnidade={false} />
        </g>
        <g data-acoplamento="true"><path d="M159 65h17l4-5" className="stroke-ds-gold-strong" strokeWidth="2.5" fill="none" /></g>
        <Bau x={180} largura={127} gradiente={gradiente} indice={2} />
      </g>
    );
  }

  return (
    <g data-veiculo-corpo>
      <g data-unidade="true">
        <Cabine gradiente={gradiente} />
        <path d="M72 65h31" className="stroke-ds-text" strokeWidth="4" strokeLinecap="round" />
      </g>
      {configuracao.unidades === 2 ? (
        <>
          <g data-acoplamento="true"><path d="M91 61h15" className="stroke-ds-gold-strong" strokeWidth="3" strokeLinecap="round" /></g>
          <Bau x={104} largura={203} gradiente={gradiente} indice={2} />
        </>
      ) : (
        <>
          <g data-acoplamento="true"><path d="M91 61h13" className="stroke-ds-gold-strong" strokeWidth="3" strokeLinecap="round" /></g>
          <Bau x={103} largura={98} gradiente={gradiente} indice={2} />
          <g data-acoplamento="true"><path d="M201 65h8" className="stroke-ds-gold-strong" strokeWidth="3" strokeLinecap="round" /></g>
          <Bau x={209} largura={99} gradiente={gradiente} indice={3} />
        </>
      )}
    </g>
  );
}

export default function DesenhoVeiculo({ configuracao, compacto = false }: Props) {
  const raiz = useRef<SVGSVGElement>(null);
  const idGradiente = `veiculo-${useId().replace(/:/g, '')}`;
  const eixos = eixosDaConfiguracao(configuracao);

  useLayoutEffect(() => {
    const elemento = raiz.current;
    if (!elemento || typeof window.matchMedia !== 'function') return;
    const media = gsap.matchMedia();
    const contexto = gsap.context(() => {
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const timeline = gsap.timeline({ defaults: { duration: 0.36, ease: 'power2.out' } });
        timeline
          .from('[data-veiculo-corpo]', { x: -18, autoAlpha: 0, clearProps: 'opacity,visibility,transform' })
          .from('[data-eixo="true"]', { scale: 0, transformOrigin: 'center center', stagger: 0.045, ease: 'back.out(1.7)', clearProps: 'transform' }, '-=0.18')
          .from('[data-eixo-rotulo="true"]', { y: -3, autoAlpha: 0, stagger: 0.035, clearProps: 'opacity,visibility,transform' }, '-=0.2')
          .fromTo('[data-acoplamento="true"]', { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.22, ease: 'power1.out', clearProps: 'transform' }, '-=0.3');
      });
    }, elemento);
    return () => {
      media.revert();
      contexto.revert();
    };
  }, [configuracao.id]);

  return (
    <svg
      ref={raiz}
      viewBox="0 0 320 126"
      className={compacto ? 'h-16 w-[10.5rem] shrink-0 sm:w-48' : 'h-28 w-full max-w-[360px]'}
      role="img"
      aria-label={`${configuracao.nome}: ${configuracao.quantidadeEixos} eixos e ${configuracao.unidades} ${configuracao.unidades === 1 ? 'unidade' : 'unidades'}`}
    >
      <title>{configuracao.nome}</title>
      <defs>
        <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="text-ds-surface" stopColor="currentColor" />
          <stop offset="1" className="text-ds-primary" stopColor="currentColor" stopOpacity="0.18" />
        </linearGradient>
        <filter id={`${idGradiente}-sombra`} x="-10%" y="-30%" width="120%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="currentColor" floodOpacity="0.16" />
        </filter>
      </defs>

      <ellipse cx="160" cy="82" rx="151" ry="7" className="fill-ds-text/10" />
      <g filter={`url(#${idGradiente}-sombra)`}>
        <CorposVeiculo configuracao={configuracao} gradiente={idGradiente} />
      </g>
      <line data-elemento="chassi" x1="10" y1="72" x2="310" y2="72" className="stroke-ds-text" strokeWidth="3" strokeLinecap="round" />

      {eixos.map((eixo) => {
        const pneus = pneusDoEixo(eixo.tipo);
        return (
          <g key={eixo.numero} data-eixo="true" data-pneus={pneus}>
            <line x1={eixo.x} y1="66" x2={eixo.x} y2="77" className="stroke-ds-text" strokeWidth="2" />
            {pneus === 'duplos' && <circle cx={eixo.x + 3} cy="80" r="8" className="fill-ds-surface stroke-ds-subtle" strokeWidth="2.5" />}
            <circle cx={eixo.x} cy="80" r="8" className="fill-ds-surface stroke-ds-text" strokeWidth="3" />
            <circle cx={eixo.x} cy="80" r="2.4" className="fill-ds-accent stroke-ds-gold-strong" strokeWidth="0.8" />
            <text data-eixo-rotulo="true" x={eixo.x} y="96" textAnchor="middle" className="fill-ds-text font-mono font-bold" fontSize="9">E{eixo.numero}</text>
          </g>
        );
      })}

      {configuracao.gruposEixo.map((grupo, indice) => {
        const eixosGrupo = eixos.filter((eixo) => eixo.grupo.id === grupo.id);
        const inicio = Math.min(...eixosGrupo.map((eixo) => eixo.x)) - 8;
        const fim = Math.max(...eixosGrupo.map((eixo) => eixo.x)) + 8;
        const limite = grupo.limiteKg?.toLocaleString('pt-BR') ?? 'conforme AET';
        return (
          <g key={grupo.id} data-grupo-eixo="true" aria-label={`${grupo.nome}: limite ${limite} kg`} role="group">
            <path d={`M${inicio} 102v4h${fim - inicio}v-4`} className="stroke-ds-primary" strokeWidth="1.3" fill="none" />
            <text x={(inicio + fim) / 2} y="117" textAnchor="middle" className="fill-ds-primary font-mono font-bold" fontSize="7.5">
              G{indice + 1} · {limiteCurto(grupo.limiteKg)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
