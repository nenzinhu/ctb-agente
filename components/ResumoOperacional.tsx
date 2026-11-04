import OrigemTexto from './OrigemTexto';
import type { CartaoEstruturado } from '@/lib/response/response-types';
import type { FichaMbft } from '@/lib/mbft/parser';
import type { MbftFields } from '@/lib/response/mbft-fields';
import { CompareFichaButton } from './comparison/ComparisonProvider';
import TextoReferenciasCtb from './TextoReferenciasCtb';
export default function ResumoOperacional({ card, ficha, campos }: { card: CartaoEstruturado; ficha?: FichaMbft; campos?: MbftFields | null }) {
  const e = card.enquadramento;
  const titulo = ficha?.tipificacaoResumida || e?.descricao || campos?.tipificacao || 'Conferência da consulta';
  const amparo = ficha?.amparoLegal || e?.amparo_legal || campos?.amparo;
  const medida = ficha?.medidaAdministrativa || e?.medida_administrativa || campos?.medidaAdministrativa;
  const gravidade = ficha?.gravidade || e?.gravidade || campos?.gravidade;
  return <section className="card card-pad" aria-label="Resumo operacional">
    <h2 className="text-xl font-bold">Resumo operacional</h2><div className="mt-2"><OrigemTexto tipo={ficha ? 'acervo' : e || campos ? 'cadastro' : card.ficha_ia ? 'ia' : 'pendente'} /></div><p className="mt-3 font-semibold">{ficha?.codigo || e?.codigo_mbft}{(ficha?.codigo || e?.codigo_mbft) && ' · '}{titulo}</p>
    {amparo && <p className="mt-2 text-sm"><TextoReferenciasCtb texto={amparo} contextoCtb /></p>}
    <dl className="mt-4 grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-ds-subtle">Gravidade</dt><dd>{gravidade || 'Confira na ficha completa'}</dd></div><div><dt className="text-sm text-ds-subtle">Providência registrada</dt><dd>{medida || 'Confira as condições e os procedimentos na ficha'}</dd></div></dl>
    {ficha?.quandoAutuar?.length ? <p className="mt-4 text-sm"><strong>Condição a conferir: </strong>{ficha.quandoAutuar[0]}</p> : null}
    {ficha?.quandoNaoAutuar?.length ? <p className="mt-3 text-sm"><strong>Atenção às exceções: </strong>{ficha.quandoNaoAutuar[0]}</p> : null}
    {ficha && <CompareFichaButton ficha={ficha} />}
    <p className="mt-4 text-xs text-ds-subtle">Resumo de apoio. A correspondência da busca não decide o enquadramento; confira a ficha completa, suas exceções e a fonte vigente.</p>
  </section>;
}
