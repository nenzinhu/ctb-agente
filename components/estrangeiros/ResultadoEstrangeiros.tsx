import { FONTES_ESTRANGEIROS } from '@/lib/estrangeiros/acervo';
import type { ResultadoEstrangeiros as Resultado } from '@/lib/estrangeiros/types';

const ROTULOS: Record<string, string> = {
  paisHabilitacao: 'País emissor da habilitação',
  visitanteOuResidente: 'Visitante ou residente',
  dataEntrada: 'Data de entrada no Brasil',
  habilitacao: 'Situação da habilitação',
  identidadeApresentada: 'Documento de identificação',
  categoriaCompativel: 'Compatibilidade da categoria',
  registroVeiculo: 'Registro do veículo',
};

export default function ResultadoEstrangeiros({ resultado }: { resultado: Resultado }) {
  return (
    <section className="mt-6 space-y-4" aria-live="polite">
      <div className="alert-warn block">
        <strong>Requer conferência documental</strong>
        <p className="mt-1 text-sm">{resultado.aviso}</p>
      </div>

      {resultado.perguntasPendentes.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Dados que ainda precisam ser informados</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {resultado.perguntasPendentes.map((campo) => <li key={campo} className="rounded-control border border-ds-line p-3 text-sm">{ROTULOS[campo] ?? campo}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="card p-5">
          <h2 className="text-lg font-semibold">Situação analisada</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {Object.entries(resultado.fatos).map(([chave, valor]) => (
              <div key={chave} className="flex justify-between gap-3 border-b border-ds-line pb-2">
                <dt className="text-ds-subtle">{ROTULOS[chave] ?? chave}</dt><dd className="font-medium">{typeof valor === 'boolean' ? (valor ? 'Sim' : 'Não') : String(valor)}</dd>
              </div>
            ))}
          </dl>
        </article>
        <article className="card p-5">
          <h2 className="text-lg font-semibold">Documentos e condições</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ds-subtle">{resultado.documentos.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>

      <article className="card p-5">
        <h2 className="text-lg font-semibold">Base internacional</h2>
        <p className="mt-2 text-sm text-ds-subtle">{resultado.baseInternacional}</p>
      </article>

      {resultado.trechos && resultado.trechos.length > 0 && (
        <article className="card p-5">
          <h2 className="text-lg font-semibold">Trechos do acervo recuperados</h2>
          <p className="mt-1 text-sm text-ds-subtle">Leia o contexto e abra o documento de origem antes de concluir. Trechos sem confirmação oficial permanecem sujeitos à revisão.</p>
          <div className="mt-4 grid gap-3">
            {resultado.trechos.map((trecho) => (
              <div key={trecho.id} className="rounded-card border border-ds-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{trecho.referencia}</strong>
                  {trecho.pagina && <span className="badge">Página {trecho.pagina}</span>}
                  <span className="text-xs text-ds-subtle">{trecho.titulo}</span>
                </div>
                <blockquote className="mt-2 border-l-2 border-ds-accent pl-3 text-sm text-ds-subtle">{trecho.texto}</blockquote>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  {trecho.arquivo && <a className="text-ds-ink underline" href={trecho.arquivo} target="_blank" rel="noreferrer">Abrir PDF anexado</a>}
                  {!trecho.urlOficial && <p className="font-medium text-ds-warn">Pendente de confirmação em fonte oficial.</p>}
                  {FONTES_ESTRANGEIROS.find((fonte) => fonte.id === trecho.fonteId)?.situacao === 'revisar' && <p className="text-ds-subtle">Fonte marcada para revisão no acervo.</p>}
                  {trecho.urlOficial && <a className="text-ds-ink underline" href={trecho.urlOficial} target="_blank" rel="noreferrer">Ver fonte oficial</a>}
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      <article className="card p-5">
        <h2 className="text-lg font-semibold">Possíveis enquadramentos</h2>
        {resultado.infracoes.length === 0 ? <p className="mt-2 text-sm text-ds-subtle">Nenhum enquadramento deve ser sugerido antes de completar e conferir os fatos.</p> : (
          <div className="mt-3 grid gap-3">
            {resultado.infracoes.map((item, indice) => (
              <div key={`${item.codigo}-${indice}`} className="rounded-card border border-ds-line p-4">
                <div className="flex flex-wrap items-center gap-2"><strong>{item.codigo}</strong><span className="badge">{item.artigo}</span><span className="badge">Condicional</span></div>
                <p className="mt-2 text-sm font-medium">{item.descricao}</p><p className="mt-2 text-sm"><strong>Condição: </strong>{item.condicao}</p><p className="mt-2 text-sm"><strong>Medida: </strong>{item.medida}</p>
                <p className="mt-2 text-xs text-ds-subtle"><strong>Fonte: </strong>{item.fonte}</p>
              </div>
            ))}
          </div>
        )}
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="card p-5"><h2 className="text-lg font-semibold">Medidas e providências</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ds-subtle">{resultado.providencias.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article className="card p-5"><h2 className="text-lg font-semibold">Fontes</h2>{resultado.fontes.map((fonte) => <div key={fonte.referencia} className="mt-3 text-sm"><strong>{fonte.titulo}</strong><p className="text-ds-subtle">{fonte.referencia}</p>{fonte.situacao === 'revisar' && <p className="mt-1 font-medium text-ds-warn">Requer revisão no acervo.</p>}</div>)}</article>
      </div>
    </section>
  );
}
