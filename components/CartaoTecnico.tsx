'use client';

import { CartaoEstruturado } from '@/lib/response/response-types';
import { formatarMulta, labelDocumento, labelResponsavel } from '@/lib/response/format';
import BadgeGravidade from './ui/BadgeGravidade';
import Icone from './ui/Icone';

interface CartaoTecnicoProps {
  card: CartaoEstruturado;
}

export default function CartaoTecnico({ card }: CartaoTecnicoProps) {
  if (!card.enquadramento) {
    return null;
  }

  const { enquadramento } = card;
  const documento = labelDocumento(enquadramento.recolhe_documento);

  return (
    <article className="card overflow-hidden">
      <header className="border-b-2 border-ds-border bg-ds-primary-soft px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border-2 border-ds-border bg-ds-surface px-2.5 py-1 font-mono text-sm font-bold text-ds-text">
            {enquadramento.codigo_mbft}
          </span>
          <BadgeGravidade gravidade={enquadramento.gravidade} />
          {enquadramento.desdobramento > 0 && (
            <span className="badge-neutral">Desdobramento {enquadramento.desdobramento}</span>
          )}
        </div>
        <h2 className="mt-3 text-xl font-bold leading-snug text-ds-text sm:text-2xl">{enquadramento.descricao}</h2>
        <p className="mt-1.5 text-sm text-ds-subtle">Responsável: {labelResponsavel(enquadramento.responsavel)}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6">
        <div className="stat">
          <dt className="stat-label">Pontos</dt>
          <dd className="stat-value">{enquadramento.pontos}</dd>
        </div>
        <div className="stat">
          <dt className="stat-label">Multa</dt>
          <dd className="stat-value">{formatarMulta(enquadramento.valor_multa)}</dd>
          <dd className="text-xs text-ds-subtle">{enquadramento.unidade}</dd>
        </div>
        <div className="stat col-span-2 sm:col-span-1">
          <dt className="stat-label">CNH exigida</dt>
          <dd className="stat-value text-base">{card.categoria_cnh_exigida}</dd>
        </div>
      </dl>

      {(documento || enquadramento.retem_veiculo || enquadramento.remove_veiculo || card.crime_transito) && (
        <div className="space-y-2 px-4 pb-4 sm:px-6 sm:pb-6">
          {documento && (
            <div className="alert-info">
              <Icone nome="arquivo" tamanho={18} className="mt-0.5 shrink-0 text-ds-ink" />
              <p className="font-semibold">Recolhimento de documento: {documento}</p>
            </div>
          )}

          {enquadramento.retem_veiculo && (
            <div className="alert-warn">
              <Icone nome="alerta" tamanho={18} className="mt-0.5 shrink-0 text-ds-warn" />
              <p className="font-semibold">Veículo retido</p>
            </div>
          )}

          {enquadramento.remove_veiculo && (
            <div className="alert-error">
              <Icone nome="alerta" tamanho={18} className="mt-0.5 shrink-0 text-ds-danger" />
              <div>
                <p className="font-semibold">Remoção obrigatória</p>
                {enquadramento.medida_administrativa && (
                  <p className="mt-0.5 text-ds-subtle">{enquadramento.medida_administrativa}</p>
                )}
              </div>
            </div>
          )}

          {card.crime_transito && (
            <div className="alert-error">
              <Icone nome="balanca" tamanho={18} className="mt-0.5 shrink-0 text-ds-danger" />
              <p className="font-semibold">Pode configurar crime de trânsito (arts. 302 a 312 do CTB)</p>
            </div>
          )}
        </div>
      )}

      <footer className="border-t-2 border-ds-border px-4 py-4 sm:px-6">
        <h3 className="stat-label">Amparo Legal</h3>
        <p className="mt-1 font-mono text-sm text-ds-text">{enquadramento.amparo_legal}</p>
      </footer>
    </article>
  );
}
