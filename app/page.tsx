import Link from 'next/link';
import ConsultaForm from '@/components/ConsultaForm';
import RecentQueries from '@/components/RecentQueries';
import { ETAPAS_CONSULTA } from '@/components/etapas';
import Icone, { type NomeIcone } from '@/components/ui/Icone';
import SectionCard from '@/components/ui/SectionCard';
import Stepper from '@/components/ui/Stepper';
import TitleCard from '@/components/ui/TitleCard';

const EXEMPLOS = ['516-91', 'art. 165', 'moto sem capacete', 'recusa do bafômetro', 'estacionar em vaga de idoso'];

const TIPOS: { titulo: string; exemplo: string; texto: string }[] = [
  { titulo: 'Código MBFT', exemplo: '516-91', texto: 'Enquadramento completo: gravidade, pontos, multa e medidas.' },
  { titulo: 'Artigo', exemplo: 'art. 181, XVII', texto: 'O texto literal do dispositivo, com os relacionados.' },
  { titulo: 'Situação', exemplo: 'dirigir usando celular', texto: 'Descreva o que viu: a busca encontra os artigos certos.' },
];

const ATALHOS: { href: string; titulo: string; texto: string; icone: NomeIcone }[] = [
  {
    href: '/pop',
    titulo: 'POP-PMSC',
    texto: 'Pergunte sobre os procedimentos operacionais padrão e veja a fonte.',
    icone: 'escudo',
  },
  { href: '/gerador-pdf', titulo: 'Dossiê em PDF', texto: 'Normas, enquadramentos e checklist para levar à rua.', icone: 'arquivo' },
  {
    href: '/comprimir-pdf',
    titulo: 'Comprimir PDF',
    texto: 'Reduza PDFs no próprio aparelho — até "somente texto".',
    icone: 'comprimir',
  },
];

export default function Home() {
  return (
    <main className="page space-y-6">
      <TitleCard
        titulo="CTB Agente"
        icone="escudo"
        subtitulo="Enquadramentos, artigos e procedimentos em segundos — sempre com o texto da lei ao lado."
      />

      <Stepper etapas={ETAPAS_CONSULTA} atual={0} rotulo="Etapas da consulta" />

      <SectionCard numero={1} titulo="Consulta">
        <ConsultaForm exemplos={EXEMPLOS} />
        <RecentQueries />
      </SectionCard>

      <SectionCard titulo="Como perguntar" icone="info">
        <ul className="grid gap-3 sm:grid-cols-3">
          {TIPOS.map((tipo) => (
            <li key={tipo.titulo} className="panel p-4">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-ds-text">{tipo.titulo}</p>
              <p className="mt-1.5 font-mono text-sm font-semibold text-ds-primary-strong">{tipo.exemplo}</p>
              <p className="mt-2 text-sm text-ds-subtle">{tipo.texto}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard titulo="Ferramentas" icone="faisca">
        <ul className="grid gap-3 sm:grid-cols-3">
          {ATALHOS.map((atalho) => (
            <li key={atalho.href}>
              <Link
                href={atalho.href}
                className="group flex h-full flex-col gap-2 rounded-control border-2 border-ds-border p-4 transition-colors hover:bg-ds-muted"
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ds-primary text-ds-on-solid">
                    <Icone nome={atalho.icone} tamanho={18} />
                  </span>
                  <span className="font-mono text-sm font-bold uppercase tracking-[0.06em] text-ds-text">{atalho.titulo}</span>
                </span>
                <span className="text-sm text-ds-subtle">{atalho.texto}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-ds-primary">
                  Abrir
                  <Icone nome="seta" tamanho={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>

      <p className="text-center text-xs text-ds-subtle">
        Para agentes de trânsito (PM, PC, PRF e municipais). Confira sempre a redação vigente antes de lavrar o AIT.
      </p>
    </main>
  );
}
