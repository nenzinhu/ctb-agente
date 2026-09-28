'use client';

import type { ReactNode } from 'react';
import { CartaoEstruturado } from '@/lib/response/response-types';
import { MbftFields } from '@/lib/response/mbft-fields';
import type { FichaMbft } from '@/lib/mbft/parser';
import { formatarMulta, labelResponsavel } from '@/lib/response/format';
import BadgeGravidade from './ui/BadgeGravidade';
import ExplicacaoSimples from './ExplicacaoSimples';
import { AlertaCrime, ExplicarAoCidadao, HistoricoLei } from './FichaExtras';
import Icone from './ui/Icone';

interface FichaFiscalizacaoProps {
  card: CartaoEstruturado;
  campos: MbftFields | null;
  /** The official sheet from the bundled MBFT: when given, it is the source of every field */
  oficial?: FichaMbft | null;
}

/** Value cell that stays honest when the MBFT text lacks the label. */
function Valor({ children }: { children: ReactNode }) {
  if (
    children === null ||
    children === undefined ||
    children === '' ||
    (Array.isArray(children) && children.length === 0)
  ) {
    return <dd className="text-sm text-ds-subtle">—</dd>;
  }
  return <dd className="whitespace-pre-line text-sm leading-relaxed text-ds-text">{children}</dd>;
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-ds-line py-3 last:border-b-0 sm:grid-cols-[minmax(11rem,16rem)_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-ds-subtle">{rotulo}</dt>
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
    <h3 className="border-b-2 border-ds-text pb-1.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-ds-primary sm:text-sm">
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
    <span className={`inline-flex items-center gap-1.5 font-semibold ${nao ? 'text-ds-text' : 'text-ds-danger'}`}>
      <Icone nome={nao ? 'x' : 'alerta'} tamanho={14} />
      {texto}
    </span>
  );
}

const GRAVIDADES = ['leve', 'média', 'grave', 'gravíssima'];

/** "7" → "7 ponto(s)"; "Não Computável" stays as written */
function pontos(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return /^\d+$/.test(valor.trim()) ? `${valor.trim()} ponto(s)` : valor;
}

/**
 * Ficha de Fiscalização — the MBFT sheet view of a consultation card.
 * Fields filled from the MBFT chunk text when present, from the
 * `enquadramentos` row otherwise; missing data renders as "—".
 */
export default function FichaFiscalizacao({ card, campos: doBanco, oficial = null }: FichaFiscalizacaoProps) {
  // The official MBFT sheet wins over the database row and the AI draft.
  const enquadramento = oficial ? null : card.enquadramento;
  const ia = oficial ? null : (card.ficha_ia ?? null);
  const doMbft: MbftFields | null = oficial
    ? {
        amparo: oficial.amparoLegal.replace(/\.$/, ''),
        tipificacao: oficial.tipificacao || null,
        infrator: oficial.infrator || null,
        competencia: oficial.competencia || null,
        constatacao: oficial.constatacao || null,
        gravidade: oficial.gravidade || null,
        pontuacao: oficial.pontuacao || null,
        penalidade: oficial.penalidade || null,
        medidaAdministrativa: oficial.medidaAdministrativa || null,
        configuraCrime: oficial.configuraCrime || null,
        quandoAutuar: oficial.quandoAutuar.join('\n') || null,
        quandoNaoAutuar: oficial.quandoNaoAutuar.join('\n') || null,
        definicoes: oficial.definicoes.join('\n') || null,
        exemplosObservacoes: oficial.exemplos,
      }
    : doBanco;
  // Base first; the AI draft only fills what the base doesn't have.
  const campos: MbftFields | null = ia
    ? {
        amparo: doMbft?.amparo ?? ia.amparoLegal,
        pontuacao: doMbft?.pontuacao ?? ia.pontuacao,
        tipificacao: doMbft?.tipificacao ?? ia.tipificacao,
        infrator: doMbft?.infrator ?? ia.infrator,
        competencia: doMbft?.competencia ?? ia.competencia,
        constatacao: doMbft?.constatacao ?? ia.constatacao,
        gravidade: doMbft?.gravidade ?? ia.gravidade,
        penalidade: doMbft?.penalidade ?? ia.penalidade,
        medidaAdministrativa: doMbft?.medidaAdministrativa ?? ia.medidaAdministrativa,
        configuraCrime: doMbft?.configuraCrime ?? ia.configuraCrime,
        quandoAutuar: doMbft?.quandoAutuar ?? ia.quandoAutuar,
        quandoNaoAutuar: doMbft?.quandoNaoAutuar ?? ia.quandoNaoAutuar,
        definicoes: doMbft?.definicoes ?? ia.definicoes,
        exemplosObservacoes: doMbft?.exemplosObservacoes.length ? doMbft.exemplosObservacoes : ia.exemplosObservacoes,
      }
    : doMbft;

  return (
    <article className="card overflow-hidden" aria-labelledby="ficha-fiscalizacao">
      <header className="border-b-2 border-ds-border bg-ds-primary-soft px-4 py-5 sm:px-6">
        <h2 id="ficha-fiscalizacao" className="font-mono text-base font-bold uppercase tracking-[0.08em] text-ds-text sm:text-lg">
          Ficha de Fiscalização
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {enquadramento ? (
            <>
              <span className="rounded-md border-2 border-ds-border bg-ds-surface px-2.5 py-1 font-mono text-sm font-bold text-ds-text">
                {enquadramento.codigo_mbft}
              </span>
              {enquadramento.desdobramento > 0 && (
                <span className="badge-neutral">Desdobramento {enquadramento.desdobramento}</span>
              )}
              <BadgeGravidade gravidade={enquadramento.gravidade} />
            </>
          ) : (
            <>
              {oficial && (
                <>
                  <span className="rounded-md border-2 border-ds-border bg-ds-surface px-2.5 py-1 font-mono text-sm font-bold text-ds-text">
                    {oficial.codigo}
                  </span>
                  {GRAVIDADES.includes(oficial.gravidade.toLowerCase()) && (
                    <BadgeGravidade gravidade={oficial.gravidade.toLowerCase()} />
                  )}
                </>
              )}
              {ia?.codigoEnquadramento && (
                <span className="rounded-md border-2 border-ds-border bg-ds-surface px-2.5 py-1 font-mono text-sm font-bold text-ds-text">
                  {ia.codigoEnquadramento}
                </span>
              )}
              {!oficial && <span className="text-sm text-ds-subtle">Consulta: “{card.consulta}”</span>}
            </>
          )}
        </div>
        {oficial && <AlertaCrime ficha={oficial} />}
        {ia && (
          <p className="alert-warn mt-3" role="note">
            <Icone nome="faisca" tamanho={16} className="mt-0.5 shrink-0 text-ds-warn" />
            <span>
              <strong>Gerada por IA</strong>
              {card.ficha_ia_modelo ? ` (${card.ficha_ia_modelo})` : ''}: a base não tinha esta infração. Confira no MBFT e
              no CTB antes de lavrar o AIT.
            </span>
          </p>
        )}
      </header>

      <div className="space-y-6 p-4 sm:p-6">
        {oficial && <ExplicacaoSimples key={oficial.codigo} tipo="ficha" id={oficial.codigo} />}
        {oficial && <ExplicarAoCidadao ficha={oficial} />}
        {oficial && <HistoricoLei ficha={oficial} />}

        <section aria-labelledby="identificacao-infracao">
          <SecaoTitulo>Identificação da Infração</SecaoTitulo>
          <dl className="mt-2">
            <Linha rotulo="Tipificação Resumida:">
              <Valor>{oficial?.tipificacaoResumida || enquadramento?.descricao || ia?.tipificacaoResumida || campos?.tipificacao}</Valor>
            </Linha>
            <Linha rotulo="Código de Enquadramento:">
              <Valor>
                {enquadramento
                  ? `${enquadramento.codigo_mbft}${enquadramento.desdobramento > 0 ? `-${enquadramento.desdobramento}` : ''}`
                  : (oficial?.codigo ?? ia?.codigoEnquadramento)}
              </Valor>
            </Linha>
            <Linha rotulo="Amparo Legal:">
              <Valor>{enquadramento?.amparo_legal ?? campos?.amparo}</Valor>
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
              {enquadramento ? (
                <dd>
                  <BadgeGravidade gravidade={enquadramento.gravidade} />
                </dd>
              ) : (
                <Valor>{campos?.gravidade}</Valor>
              )}
            </Linha>
            <Linha rotulo="Pontuação:">
              <Valor>{enquadramento ? `${enquadramento.pontos} ponto(s)` : pontos(campos?.pontuacao)}</Valor>
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
            <div className="panel p-4">
              <h4 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.06em] text-ds-text">
                <Icone nome="check" tamanho={16} className="text-ds-primary" />
                Quando Autuar
              </h4>
              {campos?.quandoAutuar ? (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ds-text">
                  {emItens(campos.quandoAutuar).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ds-subtle">—</p>
              )}
            </div>
            <div className="panel p-4">
              <h4 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.06em] text-ds-text">
                <Icone nome="x" tamanho={16} className="text-ds-danger" />
                Quando NÃO Autuar
              </h4>
              {campos?.quandoNaoAutuar ? (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ds-text">
                  {emItens(campos.quandoNaoAutuar).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ds-subtle">—</p>
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
            <ol className="mt-2 list-inside list-decimal space-y-2 text-sm leading-relaxed text-ds-text">
              {campos.exemplosObservacoes.map((exemplo, i) => (
                <li key={i} className="whitespace-pre-line">
                  {exemplo.replace(/^\d+\.\s*/, '')}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-ds-subtle">Nenhum exemplo cadastrado para este enquadramento.</p>
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
            {oficial?.informacoesComplementares.map((info, i) => (
              <Linha key={i} rotulo={i === 0 ? 'Observações:' : ''}>
                <Valor>{info}</Valor>
              </Linha>
            ))}
            {ia?.informacoesComplementares && (
              <Linha rotulo="Observações:">
                <Valor>{ia.informacoesComplementares}</Valor>
              </Linha>
            )}
            <Linha rotulo="Concurso de infrações:">
              <Valor>{card.concurso_infracoes.length > 0 ? card.concurso_infracoes.join(' · ') : null}</Valor>
            </Linha>
          </dl>
          <p className="mt-3 text-xs text-ds-subtle">
            {oficial
              ? `Ficha do MBFT (Volume I), página ${oficial.pagina} — confirme a redação vigente antes de lavrar o AIT.`
              : 'Ficha gerada a partir do MBFT e da base cadastrada — confirme a redação vigente antes de lavrar o AIT.'}
          </p>
        </section>
      </div>
    </article>
  );
}
