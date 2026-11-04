'use client';

import { useState } from 'react';
import { crimeDaFicha, explicarAoCidadao } from '@/lib/mbft/ficha-extras';
import type { FichaMbft } from '@/lib/mbft/parser';
import Icone from './ui/Icone';

/** Crime warning for the sheet header; nothing when it is not a crime. */
export function AlertaCrime({ ficha }: { ficha: FichaMbft }) {
  const crime = crimeDaFicha(ficha);
  if (!crime) return null;
  return (
    <p className="alert-error mt-3" role="note">
      <Icone nome="alerta" tamanho={16} className="mt-0.5 shrink-0" />
      <span>
        <strong>Também pode ser crime de trânsito:</strong> {crime}. Além do AIT, siga o procedimento de ocorrência criminal.
      </span>
    </p>
  );
}

/** Ready-to-read explanation for the driver, with a copy button. */
export function ExplicarAoCidadao({ ficha }: { ficha: FichaMbft }) {
  const [copiado, setCopiado] = useState<'sim' | 'erro' | null>(null);
  const texto = explicarAoCidadao(ficha);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado('sim');
    } catch {
      setCopiado('erro');
    }
  };

  return (
    <details className="rounded-control border border-ds-line p-3">
      <summary className="cursor-pointer text-sm font-semibold text-ds-text">Explicar ao cidadão</summary>
      <p className="mt-2 text-sm leading-relaxed text-ds-text">{texto}</p>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" className="btn-secondary" onClick={() => void copiar()}>
          Copiar texto
        </button>
        <span role="status" className="text-xs text-ds-subtle">
          {copiado === 'sim' ? 'Copiado.' : copiado === 'erro' ? 'Não foi possível copiar; selecione o texto.' : ''}
        </span>
      </div>
    </details>
  );
}

/** Laws that changed the cited article, as noted in the compiled CTB. */
export function HistoricoLei({ ficha }: { ficha: FichaMbft }) {
  if (!ficha.historicoLei?.length) return null;
  return (
    <div className="rounded-control border border-ds-line p-3">
      <p className="text-sm font-semibold text-ds-text">Mudou na lei</p>
      <ul className="mt-1 list-inside list-disc text-sm text-ds-text">
        {ficha.historicoLei.map((nota) => (
          <li key={nota}>{nota}</li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-ds-subtle">Notas do texto compilado do CTB para o dispositivo citado na ficha.</p>
    </div>
  );
}
