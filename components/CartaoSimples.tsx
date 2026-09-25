'use client';

import { CartaoEstruturado } from '@/lib/response/response-types';
import Icone from './ui/Icone';

interface CartaoSimplesProps {
  card: CartaoEstruturado;
}

export default function CartaoSimples({ card }: CartaoSimplesProps) {
  return (
    <article className="card card-pad">
      <div className="card-head">
        <h2 className="section-title">
          <Icone nome="info" tamanho={18} className="shrink-0" />
          Em palavras simples
        </h2>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ds-subtle">O que aconteceu?</h3>
          <p className="mt-2 leading-relaxed text-ds-text">{card.explicacao_simples}</p>
        </div>

        {card.exemplo_dia_a_dia && (
          <div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ds-subtle">Exemplo do dia a dia</h3>
            <p className="mt-2 rounded-control border-l-4 border-ds-primary bg-ds-muted p-4 italic leading-relaxed text-ds-text">
              {card.exemplo_dia_a_dia}
            </p>
          </div>
        )}

        {card.crime_transito && (
          <div className="alert-error">
            <Icone nome="balanca" tamanho={18} className="mt-0.5 shrink-0 text-ds-danger" />
            <div>
              <p className="font-bold">ATENÇÃO: Crime de trânsito</p>
              <p className="mt-0.5 text-ds-subtle">
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
