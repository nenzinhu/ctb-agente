import Link from 'next/link';
import ConsultaForm from '@/components/ConsultaForm';
import ConsultaModes from '@/components/ConsultaModes';
import RecentQueries from '@/components/RecentQueries';
import HomeReveal from '@/components/HomeReveal';
import Icone, { type NomeIcone } from '@/components/ui/Icone';
import SectionCard from '@/components/ui/SectionCard';

const EXEMPLOS = ['516-91', 'art. 165', 'moto sem capacete', 'recusa do bafômetro', 'racha'];

const TIPOS = [
  { titulo: 'Tem o código?', exemplo: '516-91 ou art. 165', texto: 'Use o enquadramento MBFT ou o artigo do CTB.', icone: 'balanca' },
  { titulo: 'Descreva a situação', exemplo: 'motorista mexendo no celular', texto: 'Conte o que aconteceu, com as palavras do dia a dia.', icone: 'busca' },
  { titulo: 'Lembra só uma parte?', exemplo: 'estacion ou bafomet', texto: 'Tente o começo da palavra. Acrescente detalhes para refinar a busca.', icone: 'faisca' },
] satisfies { titulo: string; exemplo: string; texto: string; icone: NomeIcone }[];

const ATALHOS: { href: string; titulo: string; texto: string; icone: NomeIcone }[] = [
  { href: '/favoritos', titulo: 'Seus favoritos', texto: 'Retome os enquadramentos salvos neste aparelho.', icone: 'estrela' },
  { href: '/apostila', titulo: 'Gerar apostila', texto: 'Crie material de estudo com conteúdo do MBFT ou dos POPs.', icone: 'livro' },
  { href: '/comprimir-pdf', titulo: 'Comprimir PDF', texto: 'Reduza arquivos no aparelho, inclusive para somente texto.', icone: 'comprimir' },
];

export default function Home() {
  return (
    <HomeReveal>
      <main className="page max-w-6xl space-y-7 sm:space-y-9">
        <div className="consultation-intro" data-home-reveal data-home-reveal-group="0">
          <p className="eyebrow">Ferramenta operacional para agentes de campo</p>
          <h1 className="consultation-title">CTB Agente</h1>
          <p className="consultation-lead">
            Aplicativo de apoio ao agente em campo para consultar rapidamente o CTB, as fichas do MBFT e os POPs,
            esclarecer dúvidas e conferir a fonte oficial antes da atuação.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ds-subtle">
            Ferramenta de apoio. A decisão e o procedimento devem observar a norma e o documento vigente.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0" data-home-reveal data-home-reveal-group="1">
            <SectionCard titulo="Consultar infrações e artigos" icone="busca" className="min-w-0 consultation-card">
              <ConsultaModes atual="ctb" />
              <ConsultaForm exemplos={EXEMPLOS} />
              <RecentQueries />
            </SectionCard>
          </div>

          <aside
            className="min-w-0 space-y-5"
            aria-label="Ajuda para consultar"
            data-home-reveal
            data-home-reveal-group="2"
          >
            <section className="search-guide" aria-labelledby="como-perguntar">
              <h2 id="como-perguntar" className="text-lg font-semibold text-ds-text">Como perguntar</h2>
              <p className="mt-1 text-sm text-ds-subtle">Não precisa lembrar o termo exato.</p>
              <ul className="mt-5 space-y-5">
                {TIPOS.map((tipo) => (
                  <li key={tipo.titulo} className="flex items-start gap-3">
                    <span className="search-guide-icon"><Icone nome={tipo.icone} tamanho={18} /></span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ds-text">{tipo.titulo}</h3>
                      <p className="mt-1 text-sm font-medium text-ds-primary-strong">“{tipo.exemplo}”</p>
                      <p className="mt-1 text-sm leading-relaxed text-ds-subtle">{tipo.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-ds-subtle">
              <Icone nome="info" tamanho={16} className="mt-0.5 shrink-0" />
              Mais detalhes ajudam: informe o veículo, a conduta e o local quando forem relevantes.
            </p>
          </aside>
        </div>

        <section aria-labelledby="ferramentas-titulo" data-home-reveal data-home-reveal-group="3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="ferramentas-titulo" className="text-lg font-semibold text-ds-text">No seu dia a dia</h2>
            <span className="text-xs text-ds-subtle">Ferramentas de apoio</span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {ATALHOS.map((atalho) => (
              <li key={atalho.href} className="min-w-0">
                <Link href={atalho.href} className="tool-link group">
                  <span className="flex items-center justify-between gap-3">
                    <Icone nome={atalho.icone} tamanho={21} className="text-ds-primary" />
                    <Icone nome="seta" tamanho={16} className="text-ds-subtle transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="mt-3 block font-semibold text-ds-text">{atalho.titulo}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-ds-subtle">{atalho.texto}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </HomeReveal>
  );
}
