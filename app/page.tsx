import ConsultaForm from '@/components/ConsultaForm';
import ConsultaModes from '@/components/ConsultaModes';
import RecentQueries from '@/components/RecentQueries';
import HomeReveal from '@/components/HomeReveal';
import ToolGroups from '@/components/ToolGroups';
import Icone, { type NomeIcone } from '@/components/ui/Icone';

const EXEMPLOS = ['516-91', 'art. 165', 'moto sem capacete'];

const TIPOS = [
  { titulo: 'Código ou artigo', exemplo: '516-91 ou art. 165', texto: 'Use o enquadramento MBFT ou o artigo do CTB.', icone: 'balanca' },
  { titulo: 'Situação', exemplo: 'motorista mexendo no celular', texto: 'Descreva o que aconteceu, com as palavras do dia a dia.', icone: 'busca' },
  { titulo: 'Parte da palavra', exemplo: 'estacion ou bafomet', texto: 'Abreviações e termos do dia a dia também ajudam a buscar.', icone: 'faisca' },
] satisfies { titulo: string; exemplo: string; texto: string; icone: NomeIcone }[];

export default function Home() {
  return (
    <HomeReveal>
      <main className="page max-w-6xl space-y-6 sm:space-y-8">
        <div data-home-reveal data-home-reveal-group="0">
          <h1 className="text-2xl font-bold tracking-tight text-ds-text sm:text-3xl">Consultar infrações e artigos</h1>
          <p className="mt-2 text-sm text-ds-subtle sm:text-base">Busque no CTB e nas fichas do MBFT por código, artigo ou situação.</p>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
          <div className="min-w-0" data-home-reveal data-home-reveal-group="1">
            <section aria-label="Consulta CTB" className="card-pad rounded-card bg-ds-surface">
              <ConsultaModes atual="ctb" />
              <ConsultaForm exemplos={EXEMPLOS} />
              <p className="mt-5 border-t border-ds-line pt-4 text-xs leading-relaxed text-ds-subtle">
                Ferramenta de apoio. A decisão e o procedimento devem observar a norma e o documento vigente.
              </p>
              <div id="consultas-recentes" className="scroll-mt-32"><RecentQueries /></div>
            </section>
          </div>

          <aside className="min-w-0" aria-label="Ajuda para consultar" data-home-reveal data-home-reveal-group="2">
            <details className="search-help">
              <summary>
                <span className="flex items-center gap-2"><Icone nome="info" tamanho={19} />Como pesquisar</span>
                <Icone nome="chevron" tamanho={18} className="tools-chevron shrink-0" />
              </summary>
              <div className="px-4 pb-4">
                <p className="text-sm leading-relaxed text-ds-subtle">Não precisa lembrar o termo exato.</p>
                <ul className="mt-5 space-y-5">
                  {TIPOS.map((tipo) => (
                    <li key={tipo.titulo} className="flex items-start gap-3">
                      <Icone nome={tipo.icone} tamanho={18} className="mt-0.5 shrink-0 text-ds-primary-strong" />
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-ds-text">{tipo.titulo}</h2>
                        <p className="mt-1 text-sm font-medium text-ds-primary-strong">“{tipo.exemplo}”</p>
                        <p className="mt-1 text-sm leading-relaxed text-ds-subtle">{tipo.texto}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-ds-line pt-4 text-xs leading-relaxed text-ds-subtle">Informe o veículo, a conduta e o local quando forem relevantes. Confira a fonte oficial antes da atuação.</p>
              </div>
            </details>
          </aside>
        </div>

        <section aria-labelledby="ferramentas-titulo" className="home-tools" data-home-reveal data-home-reveal-group="3">
          <h2 id="ferramentas-titulo" className="mb-5 text-lg font-semibold text-ds-text">Ferramentas por tarefa</h2>
          <ToolGroups />
        </section>
      </main>
    </HomeReveal>
  );
}
