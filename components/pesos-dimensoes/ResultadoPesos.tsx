import type { ResultadoFiscalizacao } from '@/lib/pesos-dimensoes/fiscalizacao';
import type { FontePeso } from '@/lib/pesos-dimensoes/types';
import type { ResultadoLimite } from '@/lib/pesos-dimensoes/calculadora';
import Icone from '@/components/ui/Icone';

export interface RespostaCalculoPesos {
  configuracao: { id: string; nome: string; quantidadeEixos: number };
  limite: ResultadoLimite;
  fiscalizacao: ResultadoFiscalizacao;
}

const kg = (valor: number | null) => valor === null ? '—' : `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
const reais = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;

function fontesUnicas(fontes: FontePeso[]): FontePeso[] {
  return fontes.filter((fonte, indice, todas) => todas.findIndex((outra) =>
    outra.documento === fonte.documento && outra.artigo === fonte.artigo && outra.pagina === fonte.pagina
  ) === indice);
}

export default function ResultadoPesos({ resultado }: { resultado: RespostaCalculoPesos }) {
  const { limite, fiscalizacao } = resultado;
  const fontes = fontesUnicas([...limite.fontes, ...fiscalizacao.fontes]);
  const titulo = fiscalizacao.status === 'autuavel'
    ? 'Excesso autuável encontrado'
    : fiscalizacao.status === 'inconclusivo'
      ? 'Resultado inconclusivo'
      : fiscalizacao.status === 'dentro-tolerancia'
        ? 'Acima do limite, dentro da tolerância de pesagem'
        : 'Situação regular pelos dados informados';

  return (
    <section className="card card-pad mobile-results-enter" aria-labelledby="resultado-pesos" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${fiscalizacao.status === 'autuavel' ? 'bg-ds-danger/10 text-ds-danger' : 'bg-ds-primary-soft text-ds-primary'}`}>
          <Icone nome={fiscalizacao.status === 'autuavel' || fiscalizacao.status === 'inconclusivo' ? 'alerta' : 'check'} tamanho={21} />
        </span>
        <div>
          <p className="eyebrow">Resultado da conferência</p>
          <h2 id="resultado-pesos" className="mt-1 text-xl font-bold text-ds-text">{titulo}</h2>
          <p className="mt-1 text-sm text-ds-subtle">{resultado.configuracao.nome}</p>
        </div>
      </div>

      {fiscalizacao.faltantes.length > 0 ? (
        <div className="mt-5 rounded-control border border-ds-warn bg-ds-accent/10 p-4">
          <h3 className="font-semibold">Dados necessários</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{fiscalizacao.faltantes.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="stat"><dt className="stat-label">Limite regulamentar</dt><dd className="font-mono font-bold">{kg(limite.limiteKg)}</dd></div>
            <div className="stat"><dt className="stat-label">Capacidade de carga</dt><dd className="font-mono font-bold">{kg(limite.capacidadeCargaKg)}</dd></div>
            <div className="stat"><dt className="stat-label">Peso apurado</dt><dd className="font-mono font-bold">{kg(fiscalizacao.pesoApuradoKg)}</dd></div>
            <div className="stat"><dt className="stat-label">Limite fiscalizado</dt><dd className="font-mono font-bold">{kg(fiscalizacao.limiteFiscalizacaoKg)}</dd></div>
          </dl>

          {(fiscalizacao.codigos.length > 0 || fiscalizacao.valorTotalCentavos > 0) && (
            <div className="mt-5 rounded-control border-2 border-ds-danger/60 bg-ds-danger/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {fiscalizacao.codigos.map((codigo) => <span key={codigo} className="rounded-md bg-ds-danger px-2.5 py-1 font-mono font-bold text-white">{codigo}</span>)}
                <strong className="ml-auto text-lg text-ds-danger">{reais(fiscalizacao.valorTotalCentavos)}</strong>
              </div>
              {fiscalizacao.responsavelProvavel && <p className="mt-3 text-sm"><strong>Responsável provável:</strong> {fiscalizacao.responsavelProvavel}</p>}
            </div>
          )}

          <details className="mt-5 rounded-control border border-ds-line p-4" open>
            <summary className="cursor-pointer font-semibold">Memória de cálculo</summary>
            {fiscalizacao.memoriaPeso && (
              <p className="mt-3 rounded-md bg-ds-primary-soft px-3 py-2 font-mono text-sm font-semibold text-ds-primary-strong">
                {fiscalizacao.memoriaPeso}
              </p>
            )}
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-ds-subtle">Excesso total</dt><dd className="font-mono font-semibold">{kg(fiscalizacao.excessoTotalKg)}</dd></div>
              <div><dt className="text-ds-subtle">Excesso por eixos</dt><dd className="font-mono font-semibold">{kg(fiscalizacao.excessoEixosKg)}</dd></div>
              <div><dt className="text-ds-subtle">Excesso de CMT</dt><dd className="font-mono font-semibold">{kg(fiscalizacao.excessoCmtKg)}</dd></div>
              <div><dt className="text-ds-subtle">Fator determinante</dt><dd className="font-semibold">{limite.fatorDeterminante ?? '—'}</dd></div>
              <div><dt className="text-ds-subtle">Valor por peso</dt><dd>{reais(fiscalizacao.valorPesoCentavos)}</dd></div>
              <div><dt className="text-ds-subtle">Valor por CMT</dt><dd>{reais(fiscalizacao.valorCmtCentavos)}</dd></div>
            </dl>
          </details>
          {fiscalizacao.alertaDocumento && (
            <p role="note" className="mt-4 rounded-control border border-ds-warn bg-ds-accent/10 p-3 text-sm text-ds-text">
              {fiscalizacao.alertaDocumento}
            </p>
          )}
        </>
      )}

      {fiscalizacao.providencias.length > 0 && (
        <div className="mt-5"><h3 className="font-semibold">Providências</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{fiscalizacao.providencias.map((item) => <li key={item}>{item}</li>)}</ul></div>
      )}

      <div className="mt-5 border-t border-ds-line pt-4">
        <h3 className="text-sm font-semibold">Fontes consultadas</h3>
        <ul className="mt-2 space-y-1 text-xs text-ds-subtle">
          {fontes.map((fonte) => <li key={`${fonte.documento}-${fonte.artigo}-${fonte.pagina}`}>{fonte.documento} · {fonte.artigo} · p. {fonte.pagina}</li>)}
        </ul>
      </div>
      <p className="mt-4 text-xs text-ds-subtle">Estimativa operacional. Confira documentos, equipamento, sinalização, AET e norma vigente antes de lavrar o auto.</p>
    </section>
  );
}
