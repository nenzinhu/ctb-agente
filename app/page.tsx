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
    <main className="page relative grid-fundo">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-strong to-[#0A1F16] px-5 py-8 text-white shadow-lg sm:px-10 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-[#1DA860]/20 blur-2xl"
        />
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">
          Policia Militar Rodovia de Santa Catarina
        </p>
        <h1 className="mt-2 text-3xl font-bold uppercase tracking-tight sm:text-4xl">PMRV-SC</h1>
        <p className="mt-3 max-w-xl text-base text-white/85 sm:text-lg">
          Consulta inteligente de legislação de trânsito, enquadramentos e POPs — sempre com a fonte ao lado.
        </p>
      </section>

      {/* Consulta */}
      <section className="card card-pad -mt-6 mx-2 sm:mx-6 relative" aria-label="Consulta">
        <ConsultaForm exemplos={EXEMPLOS} />
        <RecentQueries />
      </section>

      {/* Como perguntar */}
      <section className="mt-10" aria-labelledby="como-perguntar">
        <h2 id="como-perguntar" className="section-title">
          <Icone nome="info" tamanho={18} className="text-primary" />
          Como perguntar
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {TIPOS.map((tipo) => (
            <li key={tipo.titulo} className="panel p-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-ink-strong">{tipo.titulo}</p>
              <p className="mt-1 font-mono text-sm text-primary">{tipo.exemplo}</p>
              <p className="mt-2 text-sm text-muted">{tipo.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Ferramentas */}
      <section className="mt-10" aria-labelledby="ferramentas">
        <h2 id="ferramentas" className="section-title">
          <Icone nome="faisca" tamanho={18} className="text-primary" />
          Ferramentas
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {ATALHOS.map((atalho) => (
            <li key={atalho.href}>
              <Link
                href={atalho.href}
                className="group card flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md hover:border-primary hover:-translate-y-0.5"
              >
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Icone nome={atalho.icone} />
                </span>
                <span className="text-base font-bold uppercase tracking-wide text-ink-strong">{atalho.titulo}</span>
                <span className="text-sm text-muted">{atalho.texto}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold uppercase text-primary-accent group-hover:gap-2 transition-all">
                  Abrir
                  <Icone nome="seta" tamanho={16} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Aqui ficam as demos do design system */}
      <section className="mt-10" aria-labelledby="demo-design-system">
        <h2 id="demo-design-system" className="section-title">
          <Icone nome="engrenagem" tamanho={18} className="text-primary" />
          Demo Design System
        </h2>
        <div className="mt-3 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-strong mb-4">Botões</h3>
            <div className="card card-pad">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary">Primário</button>
                  <button className="btn-primary-accent">Accent</button>
                  <button className="btn-secondary">Secundário</button>
                  <button className="btn-ghost">Ghost</button>
                  <button className="btn-danger">Risco</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary btn-sm">Sm</button>
                  <button className="btn-primary" disabled>Desabilitado</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-strong mb-4">Cards</h3>
            <div className="space-y-4">
              <div className="card card-pad">
                <h4 className="font-bold uppercase text-ink-strong">Card simples</h4>
                <p className="mt-2 text-sm text-muted">Borda #BDD3C5, borda-radius 12px, sombras suaves.</p>
              </div>
              <div className="card card-pad" style={{ borderTop: '4px solid rgb(var(--primary-accent))' }}>
                <h4 className="font-bold uppercase text-ink-strong">Card accent</h4>
                <p className="mt-2 text-sm text-muted">Barra superior em #1DA860.</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-strong mb-4">Selects</h3>
            <div className="card card-pad">
              <label className="select-label">Artigo</label>
              <select className="select text-left">
                <option>Art. 165 CTB</option>
                <option>Art. 166 CTB</option>
                <option>Art. 173 CTB</option>
              </select>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-strong mb-4">Chips / Badges</h3>
            <div className="flex flex-wrap gap-2">
              <span className="chip chip-primary">Primário</span>
              <span className="chip chip-accent">Accent</span>
              <span className="chip chip-neutral">Neutro</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="badge badge-neutral">Leve</span>
              <span className="badge badge-media">Média</span>
              <span className="badge badge-grave">Grave</span>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-10 text-center text-xs text-muted">
        Para agentes de trânsito de Santa Catarina (PM, PC e municipais). Confira sempre a redação vigente antes de lavrar o AIT.
      </p>
    </main>
  );
}
