'use client';

import { CartaoEstruturado } from '@/lib/response/response-types';
import Icone from './ui/Icone';

interface CartaoSimplesProps {
  card: CartaoEstruturado;
}

export default function CartaoSimples({ card }: CartaoSimplesProps) {
  return (
    <article className="card card-pad">
      <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
          <Icone nome="info" tamanho={18} />
        </span>
        Em palavras simples
      </h2>

      <div className="mt-5 space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">O que aconteceu?</h3>
          <p className="mt-2 leading-relaxed text-ink">{card.explicacao_simples}</p>
        </div>

        {card.exemplo_dia_a_dia && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Exemplo do dia a dia</h3>
            <p className="mt-2 rounded-xl border-l-4 border-brand bg-surface-2 p-4 italic leading-relaxed text-ink">
              {card.exemplo_dia_a_dia}
            </p>
          </div>
        )}

        {card.crime_transito && (
          <div className="alert-error">
            <Icone nome="balanca" tamanho={18} className="mt-0.5 shrink-0 text-danger" />
            <div>
              <p className="font-bold">ATENÇÃO: Crime de trânsito</p>
              <p className="mt-0.5 text-muted">
                {typeof card.crime_transito === 'boolean'
                  ? 'Esta infração pode ser enquadrada como crime de trânsito.'
                  : card.crime_transito}
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
