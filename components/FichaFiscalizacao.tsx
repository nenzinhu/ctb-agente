'use client';

import type { ReactNode } from 'react';
import { CartaoEstruturado } from '@/lib/response/response-types';
import { MbftFields } from '@/lib/response/mbft-fields';
import { formatarMulta, labelResponsavel } from '@/lib/response/format';
import BadgeGravidade from './ui/BadgeGravidade';
import Icone from './ui/Icone';

interface FichaFiscalizacaoProps {
  card: CartaoEstruturado;
  campos: MbftFields | null;
}

/** Value cell that stays honest when the MBFT text lacks the label. */
function Valor({ children }: { children: ReactNode }) {
  if (
    children === null ||
    children === undefined ||
    children === '' ||
    (Array.isArray(children) && children.length === 0)
  ) {
    return <dd className="text-sm text-muted">—</dd>;
  }
  return <dd className="whitespace-pre-line text-sm leading-relaxed text-ink">{children}</dd>;
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-line py-3 last:border-b-0 sm:grid-cols-[minmax(11rem,16rem)_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-muted">{rotulo}</dt>
      {children}
    </div>
  );
}

/** Split a labeled value into top-level numbered items when it is a list. */
function emItens(valor: string): string[] {
  const partes = valor
    .split(/(?=(?:^|\s)\d+\.\s)/)
    .map((p) => p.trim())
    .filter((p) => /^\d+\./.test(p));
  return partes.length > 0 ? partes : [valor];
}

function SecaoTitulo({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-b-2 border-brand/40 pb-1.5 text-sm font-bold uppercase tracking-wider text-brand">
      {children}
    </h3>
  );
}

function SimNao({ valor, fallback }: { valor: string | null; fallback: boolean }) {
  const texto =
    valor !== null && valor !== ''
      ? valor
      : fallback
        ? 'SIM (detectado nos dispositivos citados)'
        : 'NÃO';
  const nao = /^n[ãa]o\b/i.test(texto);
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${nao ? 'text-ink' : 'text-danger'}`}>
      <Icone nome={nao ? 'x' : 'alerta'} tamanho={14} />
      {texto}
    </span>
  );
}

/**
 * Ficha de Fiscalização — the MBFT sheet view of a consultation card.
 * Fields filled from the MBFT chunk text when present, from the
 * `enquadramentos` row otherwise; missing data renders as "—".
 */
export default function FichaFiscalizacao({ card, campos }: FichaFiscalizacaoProps) {
  const { enquadramento } = card;

  return (
    <article className="card overflow-hidden" aria-labelledby="ficha-fiscalizacao">
      <header className="border-b border-line bg-brand-soft/60 px-5 py-5 sm:px-6">
        <h2 id="ficha-fiscalizacao" className="text-lg font-black uppercase tracking-wide text-ink sm:text-xl">
          Ficha de Fiscalização
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {enquadramento ? (
            <>
              <span className="rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-sm font-bold text-ink">
                {enquadramento.codigo_mbft}
              </span>
              {enquadramento.desdobramento > 0 && (
                <span className="badge-neutral">Desdobramento {enquadramento.desdobramento}</span>
              )}
              <BadgeGravidade gravidade={enquadramento.gravidade} />
            </>
          ) : (
            <span className="text-sm text-muted">Consulta: “{card.consulta}”</span>
          )}
        </div>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        <section aria-labelledby="identificacao-infracao">
          <SecaoTitulo>Identificação da Infração</SecaoTitulo>
          <dl className="mt-2">
            <Linha rotulo="Tipificação Resumida:">
              <Valor>{enquadramento?.descricao ?? campos?.tipificacao}</Valor>
            </Linha>
            <Linha rotulo="Código de Enquadramento:">
              <Valor>
                {enquadramento
                  ? `${enquadramento.codigo_mbft}${enquadramento.desdobramento > 0 ? `-${enquadramento.desdobramento}` : ''}`
                  : null}
              </Valor>
            </Linha>
            <Linha rotulo="Amparo Legal:">
              <Valor>{enquadramento?.amparo_legal}</Valor>
            </Linha>
            <Linha rotulo="Tipificação do Enquadramento:">
              <Valor>{campos?.tipificacao}</Valor>
            </Linha>
            <Linha rotulo="Infrator:">
              <Valor>
                {campos?.infrator ?? (enquadramento ? labelResponsavel(enquadramento.responsavel) : null)}
              </Valor>
            </Linha>
            <Linha rotulo="Competência:">
              <Valor>{campos?.competencia}</Valor>
            </Linha>
            <Linha rotulo="Constatação da Infração:">
              <Valor>{campos?.constatacao}</Valor>
            </Linha>
          </dl>
        </section>

        <section aria-labelledby="classificacao-penalidades">
          <SecaoTitulo>Classificação e Penalidades</SecaoTitulo>
          <dl className="mt-2">
            <Linha rotulo="Gravidade:">
              <dd>{enquadramento ? <BadgeGravidade gravidade={enquadramento.gravidade} /> : <Valor>{campos?.gravidade}</Valor>}</dd>
            </Linha>
            <Linha rotulo="Pontuação:">
              <Valor>{enquadramento ? `${enquadramento.pontos} ponto(s)` : null}</Valor>
            </Linha>
            <Linha rotulo="Penalidade:">
              <Valor>
                {campos?.penalidade ??
                  (enquadramento
                    ? `Multa de ${formatarMulta(enquadramento.valor_multa)} (${enquadramento.unidade})`
                    : null)}
              </Valor>
            </Linha>
            <Linha rotulo="Medida Administrativa:">
              <Valor>{enquadramento?.medida_administrativa ?? campos?.medidaAdministrativa}</Valor>
            </Linha>
            <Linha rotulo="Pode Configurar Crime de Trânsito:">
              <Valor>
                <SimNao valor={campos?.configuraCrime ?? null} fallback={card.crime_transito} />
              </Valor>
            </Linha>
          </dl>
        </section>

        <section aria-labelledby="criterios-autuacao" className="space-y-4">
          <SecaoTitulo>Critérios de Autuação</SecaoTitulo>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card card-pad bg-surface-2">
              <h4 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Icone nome="check" tamanho={16} className="text-brand" />
                Quando Autuar
              </h4>
              {campos?.quandoAutuar ? (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink">
                  {emItens(campos.quandoAutuar).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">—</p>
              )}
            </div>
            <div className="card card-pad bg-surface-2">
              <h4 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Icone nome="x" tamanho={16} className="text-danger" />
                Quando NÃO Autuar
              </h4>
              {campos?.quandoNaoAutuar ? (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink">
                  {emItens(campos.quandoNaoAutuar).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">—</p>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="definicoes-procedimentos">
          <SecaoTitulo>Definições e Procedimentos</SecaoTitulo>
          <Valor>{campos?.definicoes}</Valor>
        </section>

        <section aria-labelledby="exemplos-observacoes">
          <SecaoTitulo>Exemplos do Campo de Observações do AIT</SecaoTitulo>
          {campos?.exemplosObservacoes && campos.exemplosObservacoes.length > 0 ? (
            <ol className="mt-2 list-inside list-decimal space-y-2 text-sm leading-relaxed text-ink">
              {campos.exemplosObservacoes.map((exemplo, i) => (
                <li key={i} className="whitespace-pre-line">
                  {exemplo.replace(/^\d+\.\s*/, '')}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-muted">Nenhum exemplo cadastrado para este enquadramento.</p>
          )}
        </section>

        <section aria-labelledby="informacoes-complementares">
          <SecaoTitulo>Informações Complementares</SecaoTitulo>
          <dl className="mt-2">
            <Linha rotulo="Unidade de multa:">
              <Valor>{enquadramento?.unidade ?? null}</Valor>
            </Linha>
            <Linha rotulo="CNH exigida:">
              <Valor>{card.categoria_cnh_exigida !== 'desconhecida' ? card.categoria_cnh_exigida : null}</Valor>
            </Linha>
            <Linha rotulo="Normas relacionadas:">
              <Valor>{card.normas_relacionadas.length > 0 ? card.normas_relacionadas.join(' · ') : null}</Valor>
            </Linha>
            <Linha rotulo="Concurso de infrações:">
              <Valor>{card.concurso_infracoes.length > 0 ? card.concurso_infracoes.join(' · ') : null}</Valor>
            </Linha>
          </dl>
          <p className="mt-3 text-xs text-muted">
            Ficha gerada a partir do MBFT e da base cadastrada — confirme a redação vigente antes de
            lavrar o AIT.
          </p>
        </section>
      </div>
    </article>
  );
}
