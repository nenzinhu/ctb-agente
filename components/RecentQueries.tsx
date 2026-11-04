'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRecentQueries, clearRecentQueries, saveQuery } from '@/lib/search/local-storage';
import Icone from './ui/Icone';

export default function RecentQueries() {
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setRecent(getRecentQueries());
  }, []);

  const handleQueryClick = (query: string) => {
    saveQuery(query);
    router.push(`/consulta?q=${encodeURIComponent(query)}`);
  };

  const handleClear = () => {
    if (clearRecentQueries()) {
      setRecent([]);
      setError(null);
    } else setError('O aparelho não permitiu apagar o histórico. Verifique as permissões do navegador.');
  };

  return (
    <section aria-label="Consultas recentes" className="mt-6 border-t border-ds-line pt-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ds-text">
          <Icone nome="relogio" tamanho={14} />
          Consultas recentes
        </h3>
        <button type="button" onClick={handleClear} aria-label="Limpar consultas recentes" className="btn-ghost btn-sm" disabled={recent.length === 0}>
          Limpar
        </button>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-ds-subtle">Apenas códigos e artigos ficam neste aparelho. Descrições livres não são salvas no histórico.</p>
      {error && <p className="field-error mb-3" role="alert">{error}</p>}
      {recent.length === 0 && <p className="text-sm text-ds-subtle">Nenhum código ou artigo recente neste aparelho.</p>}
      <div className="flex flex-wrap gap-2">
        {recent.map((query, idx) => (
          <button key={idx} type="button" onClick={() => handleQueryClick(query)} title={query} className="chip max-w-[16rem]">
            {query}
          </button>
        ))}
      </div>
    </section>
  );
}
