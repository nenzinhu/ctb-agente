import type { ItemPop, Pop } from '@/lib/pop/parser';
import ExplicacaoSimples from '../ExplicacaoSimples';
import Icone, { type NomeIcone } from '../ui/Icone';

const RECUO = ['pl-0', 'pl-4', 'pl-8', 'pl-12'];

/** Items keep the manual's numbering ("1.", "a.", "I.") and its indentation */
function Itens({ itens }: { itens: ItemPop[] }) {
  if (itens.length === 0) return <p className="text-sm text-ds-subtle">—</p>;
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed text-ds-text">
      {itens.map((item, i) => (
        <li key={i} className={RECUO[Math.min(item.nivel, 3)]}>
          {item.texto}
        </li>
      ))}
    </ul>
  );
}

function Secao({ titulo, icone, children }: { titulo: string; icone?: NomeIcone; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 border-b-2 border-ds-text pb-1.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-ds-primary sm:text-sm">
        {icone && <Icone nome={icone} tamanho={16} className="shrink-0" />}
        {titulo}
      </h3>
      {children}
    </section>
  );
}

/**
 * A POP in the manual's standard form: header (number, dates, execução),
 * material, legal basis, sequence of actions, critical activities, errors to
 * avoid and annexes.
 */
export default function FichaPop({ pop }: { pop: Pop }) {
  return (
    <article className="card overflow-hidden" aria-labelledby={`pop-${pop.numero}`}>
      <header className="border-b-2 border-ds-border bg-ds-primary-soft px-4 py-5 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-ds-subtle">Procedimento Operacional Padrão</p>
        <div className="mt-2 flex flex-wrap items-start gap-2">
          <span className="rounded-md border-2 border-ds-border bg-ds-surface px-2.5 py-1 font-mono text-sm font-bold text-ds-text">
            POP {pop.numero}
          </span>
        </div>
        <h2 id={`pop-${pop.numero}`} className="mt-3 font-mono text-base font-bold uppercase leading-snug tracking-[0.04em] text-ds-text sm:text-lg">
          {pop.titulo}
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            ['Estabelecido em', pop.estabelecido],
            ['Atualizado em', pop.atualizado],
            ['Execução', pop.execucao],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="rounded-control border border-ds-line bg-ds-surface px-3 py-2">
              <dt className="stat-label">{rotulo}</dt>
              <dd className="font-mono text-sm font-semibold text-ds-text">{valor || '—'}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="space-y-6 p-4 sm:p-6">
        <ExplicacaoSimples key={pop.numero} tipo="pop" id={pop.numero} />

        <Secao titulo="Material Necessário" icone="lista">
          <Itens itens={pop.material} />
        </Secao>

        <Secao titulo="Fundamentação Legal e Doutrinária" icone="balanca">
          {pop.fundamentacao.length === 0 ? (
            <p className="text-sm text-ds-subtle">—</p>
          ) : (
            <div className="mobile-table-scroll">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-ds-line">
                  <th scope="col" className="stat-label py-1.5 pr-3 font-semibold">Legislação/Doutrina</th>
                  <th scope="col" className="stat-label py-1.5 font-semibold">Especificação</th>
                </tr>
              </thead>
              <tbody>
                {pop.fundamentacao.map((f, i) => (
                  <tr key={i} className="border-b border-ds-line last:border-b-0 align-top">
                    <td className="py-2 pr-3 text-ds-text">{f.norma || '—'}</td>
                    <td className="py-2 text-ds-text">{f.especificacao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Secao>

        <Secao titulo="Sequência das Ações" icone="check">
          <Itens itens={pop.sequencia} />
        </Secao>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="panel p-4">
            <Secao titulo="Atividades Críticas" icone="alerta">
              <Itens itens={pop.atividadesCriticas} />
            </Secao>
          </div>
          <div className="panel p-4">
            <Secao titulo="Erros a Serem Evitados" icone="x">
              <Itens itens={pop.errosEvitar} />
            </Secao>
          </div>
        </div>

        {pop.anexos.length > 0 && (
          <details className="rounded-control border border-ds-line p-4">
            <summary className="cursor-pointer font-mono text-xs font-bold uppercase tracking-[0.08em] text-ds-primary">
              Anexos ({pop.anexos.length} itens)
            </summary>
            <div className="mt-3">
              <Itens itens={pop.anexos} />
            </div>
          </details>
        )}

        <p className="text-xs text-ds-subtle">
          Manual de POP PMSC compilado, página {pop.pagina}. Confira a versão vigente do POP antes de agir.
        </p>
      </div>
    </article>
  );
}
