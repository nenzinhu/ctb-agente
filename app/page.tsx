import Link from 'next/link';
import ConsultaForm from '@/components/ConsultaForm';
import RecentQueries from '@/components/RecentQueries';
import Icone, { type NomeIcone } from '@/components/ui/Icone';

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
    <main className="page">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1f7a52] via-[#1a5f3f] to-[#0c2f20] px-5 py-8 text-white shadow-lg sm:px-10 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-[#f5b301]/20 blur-2xl"
        />
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Código de Trânsito Brasileiro</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">CTB Agente</h1>
        <p className="mt-3 max-w-xl text-base text-white/85 sm:text-lg">
          Enquadramentos, artigos e procedimentos em segundos — sempre com o texto da lei ao lado.
        </p>
      </section>

      <section className="card card-pad -mt-6 mx-2 sm:mx-6 relative" aria-label="Consulta">
        <ConsultaForm exemplos={EXEMPLOS} />
        <RecentQueries />
      </section>

      <section className="mt-10" aria-labelledby="como-perguntar">
        <h2 id="como-perguntar" className="section-title">
          <Icone nome="info" tamanho={18} className="text-brand" />
          Como perguntar
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {TIPOS.map((tipo) => (
            <li key={tipo.titulo} className="panel p-4">
              <p className="text-sm font-semibold text-ink">{tipo.titulo}</p>
              <p className="mt-1 font-mono text-sm text-brand">{tipo.exemplo}</p>
              <p className="mt-2 text-sm text-muted">{tipo.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="ferramentas">
        <h2 id="ferramentas" className="section-title">
          <Icone nome="faisca" tamanho={18} className="text-brand" />
          Ferramentas
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {ATALHOS.map((atalho) => (
            <li key={atalho.href}>
              <Link
                href={atalho.href}
                className="group card flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icone nome={atalho.icone} />
                </span>
                <span className="text-base font-semibold text-ink">{atalho.titulo}</span>
                <span className="text-sm text-muted">{atalho.texto}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  Abrir
                  <Icone nome="seta" tamanho={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-center text-xs text-muted">
        Para agentes de trânsito (PM, PC, PRF e municipais). Confira sempre a redação vigente antes de lavrar o AIT.
      </p>
    </main>
  );
}
