'use client';

import { useId, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

import type { ConfiguracaoVeiculo, GrupoEixo, TipoGrupoEixo } from '@/lib/pesos-dimensoes/types';

interface Props {
  configuracao: ConfiguracaoVeiculo;
  compacto?: boolean;
  /** Thumbnail omits labels: the selector provides readable technical text. */
  miniatura?: boolean;
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
    <g data-elemento="cabine" strokeLinejoin="round">
      <path d="M18 35 27 26h29l9 9-8 8Z" fill={`url(#${gradiente}-teto)`} stroke="#648377" strokeWidth="0.8" />
      <path d="M18 35 10 44v24l8 5 8-28Z" fill="#123e32" stroke="#10392e" strokeWidth="0.8" />
      <path d="M18 35h36c5 0 8 3 10 7l8 14v17H18V43Z" fill={`url(#${gradiente}-cabine)`} stroke="#174c3c" strokeWidth="1" />
      <path data-elemento="parabrisa" d="M19 39h10v15H16V45Z" fill={`url(#${gradiente}-vidro)`} stroke="#122e32" strokeWidth="0.9" />
      <path data-elemento="janela-lateral" d="M34 39h18c3 0 5 2 7 5l5 10H34Z" fill={`url(#${gradiente}-vidro)`} stroke="#122e32" strokeWidth="0.9" />
      <path d="m37 41 13 11M19 42l6 10" stroke="#d8f2f5" strokeOpacity="0.45" strokeWidth="1.4" />
      <path data-elemento="porta" d="M33 56v14h30V56M18 58h11" fill="none" stroke="#b3d5c4" strokeOpacity="0.5" strokeWidth="0.7" />
      <rect x="53" y="58" width="7" height="1.8" rx="0.8" fill="#dfe7e8" />
      <path data-elemento="retrovisor" d="M16 43h-5v10h4M32 43h-3v10h3" fill="none" stroke="#293b42" strokeWidth="1.4" />
      <path d="M12 59h6v4h-6Z" fill="#effbff" stroke="#788f98" strokeWidth="0.7" />
      <path d="M11 66h17v5H11Z" fill="#36484f" />
      <path d="M12 67h12M14 69h10" stroke="#90a7ad" strokeWidth="0.6" />
      <path d="M33 68h26l3 5H33Z" fill="#7c9298" />
      <path d="M37 69h17" stroke="#e7eff1" strokeWidth="0.8" />
      <path d="M20 35h32" stroke="#d7eee0" strokeWidth="1.1" />
    </g>
  );
}

function Bau({ x, largura, gradiente, indice, marcarUnidade = true }: { x: number; largura: number; gradiente: string; indice: number; marcarUnidade?: boolean }) {
  const fim = x + largura;
  return (
    <g data-unidade={marcarUnidade ? 'true' : undefined} strokeLinejoin="round">
      <path d={`M${x} 31l8-8h${largura}l-8 8Z`} fill={`url(#${gradiente}-teto)`} stroke="#a5b6c1" strokeWidth="0.7" />
      <path d={`M${fim} 31l8-8v39l-8 8Z`} fill="#899eae" stroke="#738c9c" strokeWidth="0.7" />
      <rect x={x} y="31" width={largura} height="39" rx="1.5" fill={`url(#${gradiente})`} stroke="#879eac" strokeWidth="0.9" />
      <path data-elemento="nervuras" d={`M${x + 4} 39H${fim - 5}M${x + 4} 45H${fim - 5}M${x + 4} 51H${fim - 5}M${x + 4} 57H${fim - 5}`} stroke="#8ba0b0" strokeOpacity="0.35" strokeWidth="0.6" />
      <path d={`M${x + 3} 33H${fim - 3}`} stroke="#fff" strokeWidth="1" />
      <path d={`M${x + 1} 63h${largura - 2}v4H${x + 1}Z`} fill="#286653" />
      <path data-elemento="porta-traseira" d={`M${fim - 16} 34v26M${fim - 10} 34v26`} stroke="#6c8596" strokeWidth="0.8" />
      <path d={`M${fim - 18} 42h10M${fim - 18} 54h10`} stroke="#fafcff" strokeWidth="1" />
      <rect x={x + 5} y="64" width="5" height="2" rx="0.4" fill="#efc875" />
      <rect x={fim - 8} y="64" width="5" height="2" rx="0.4" fill="#b4453d" />
      <text x={x + 7} y="43" fill="#365a4b" fontFamily="monospace" fontWeight="600" fontSize="6">U{indice}</text>
      <path data-elemento="apoio" d={`M${fim - 25} 70v5m12-5v5`} stroke="#3b4d54" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function RodaUnitaria({ x, gradiente, secundária = false }: { x: number; gradiente: string; secundária?: boolean }) {
  return (
    <g data-roda-unitaria={secundária ? 'secundaria' : 'principal'}>
      <circle cx={x} cy="80" r="9" fill={`url(#${gradiente}-pneu)`} stroke="#101d26" strokeWidth="1" />
      <circle cx={x} cy="80" r="7.3" fill="none" stroke="#65737b" strokeOpacity="0.6" strokeWidth="0.7" />
      <circle cx={x} cy="80" r="5.3" fill={`url(#${gradiente}-aro)`} stroke="#c3d0d6" strokeWidth="0.8" />
      {[0, 60, 120, 180, 240, 300].map((angulo) => (
        <circle key={angulo} cx={x + Math.cos(angulo * Math.PI / 180) * 3.2} cy={80 + Math.sin(angulo * Math.PI / 180) * 3.2} r="0.65" fill="#485e6b" />
      ))}
      <circle cx={x} cy="80" r="1.8" fill="#8298a5" stroke="#e3ebef" strokeWidth="0.6" />
    </g>
  );
}

function Roda({ x, gradiente, duplo = false }: { x: number; gradiente: string; duplo?: boolean }) {
  return (
    <g data-roda="true">
      {duplo && <RodaUnitaria x={x + 4} gradiente={gradiente} secundária />}
      <RodaUnitaria x={x} gradiente={gradiente} />
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

export default function DesenhoVeiculo({ configuracao, compacto = false, miniatura = false }: Props) {
  const raiz = useRef<SVGSVGElement>(null);
  const idGradiente = `veiculo-${useId().replace(/:/g, '')}`;
  const eixos = eixosDaConfiguracao(configuracao);

  useLayoutEffect(() => {
    const elemento = raiz.current;
    if (miniatura || !elemento || typeof window.matchMedia !== 'function') return;
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
  }, [configuracao.id, miniatura]);

  return (
    <svg
      ref={raiz}
      viewBox={miniatura ? '0 16 320 78' : '0 0 320 136'}
      className={`vehicle-illustration ${miniatura
        ? 'h-14 w-24 shrink-0 sm:w-32'
        : compacto
        ? 'h-32 w-full max-w-[22rem] shrink-0 max-[639px]:h-24 max-[639px]:w-[8.5rem] max-[639px]:max-w-[42%] sm:h-36 sm:w-64'
        : 'h-44 w-full max-w-[30rem] sm:h-48'}`}
      role="img"
      aria-label={`${configuracao.nome}: ${configuracao.quantidadeEixos} eixos e ${configuracao.unidades} ${configuracao.unidades === 1 ? 'unidade' : 'unidades'}`}
    >
      <title>{configuracao.nome}</title>
      <defs>
        <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fbfd" />
          <stop offset="0.4" stopColor="#dce6ed" />
          <stop offset="1" stopColor="#a1b6c4" />
        </linearGradient>
        <linearGradient id={`${idGradiente}-teto`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f5fafc" />
          <stop offset="1" stopColor="#b9cbd4" />
        </linearGradient>
        <linearGradient id={`${idGradiente}-cabine`} x1="0" y1="0" x2="0.8" y2="1">
          <stop stopColor="#70a991" />
          <stop offset="0.5" stopColor="#2b7359" />
          <stop offset="1" stopColor="#134332" />
        </linearGradient>
        <linearGradient id={`${idGradiente}-vidro`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#b3d9e2" />
          <stop offset="0.4" stopColor="#4c758a" />
          <stop offset="1" stopColor="#173b4c" />
        </linearGradient>
        <radialGradient id={`${idGradiente}-pneu`} cx="35%" cy="28%" r="75%">
          <stop stopColor="#52616b" />
          <stop offset="1" stopColor="#17232d" />
        </radialGradient>
        <radialGradient id={`${idGradiente}-aro`} cx="35%" cy="25%" r="75%">
          <stop stopColor="#f4f8fa" />
          <stop offset="0.5" stopColor="#b7cad4" />
          <stop offset="1" stopColor="#6d8795" />
        </radialGradient>
        <filter id={`${idGradiente}-sombra`} x="-10%" y="-30%" width="120%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="currentColor" floodOpacity="0.16" />
        </filter>
      </defs>

      <ellipse cx="160" cy="84" rx="151" ry="7" className="fill-ds-text/10" />
      <g filter={`url(#${idGradiente}-sombra)`}>
        <CorposVeiculo configuracao={configuracao} gradiente={idGradiente} />
      </g>
      <line data-elemento="chassi" x1="10" y1="72" x2="310" y2="72" className="stroke-ds-text" strokeWidth="3" strokeLinecap="round" />

      {eixos.map((eixo) => {
        const pneus = pneusDoEixo(eixo.tipo);
        return (
          <g key={eixo.numero} data-eixo="true" data-pneus={pneus}>
            <line x1={eixo.x} y1="66" x2={eixo.x} y2="77" className="stroke-ds-text" strokeWidth="2" />
            <Roda x={eixo.x} gradiente={idGradiente} duplo={pneus === 'duplos'} />
            {!miniatura && <text data-eixo-rotulo="true" x={eixo.x} y="97" textAnchor="middle" className="fill-ds-text font-mono font-bold" fontSize="15">E{eixo.numero}</text>}
          </g>
        );
      })}

      {!miniatura && configuracao.gruposEixo.map((grupo, indice) => {
        const eixosGrupo = eixos.filter((eixo) => eixo.grupo.id === grupo.id);
        const inicio = Math.min(...eixosGrupo.map((eixo) => eixo.x)) - 8;
        const fim = Math.max(...eixosGrupo.map((eixo) => eixo.x)) + 8;
        const limite = grupo.limiteKg?.toLocaleString('pt-BR') ?? 'conforme AET';
        return (
          <g key={grupo.id} data-grupo-eixo="true" aria-label={`${grupo.nome}: limite ${limite} kg`} role="group">
            <path d={`M${inicio} 102v4h${fim - inicio}v-4`} className="stroke-ds-primary" strokeWidth="1.3" fill="none" />
            <text x={(inicio + fim) / 2} y={indice % 2 === 0 ? 116 : 130} textAnchor="middle" className="fill-ds-primary font-mono font-bold" fontSize="13">
              G{indice + 1} · {limiteCurto(grupo.limiteKg)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
