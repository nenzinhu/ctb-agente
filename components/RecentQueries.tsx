'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRecentQueries, clearRecentQueries, saveQuery } from '@/lib/search/local-storage';
import Icone from './ui/Icone';

export default function RecentQueries() {
  const [recent, setRecent] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    setRecent(getRecentQueries());
  }, []);

  const handleQueryClick = (query: string) => {
    saveQuery(query);
    router.push(`/consulta?q=${encodeURIComponent(query)}`);
  };

  const handleClear = () => {
    clearRecentQueries();
    setRecent([]);
  };

  if (recent.length === 0) return null;

  return (
    <div className="mt-6 border-t border-ds-line pt-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ds-text">
          <Icone nome="relogio" tamanho={14} />
          Consultas recentes
        </h3>
        <button type="button" onClick={handleClear} className="btn-ghost btn-sm">
          Limpar
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((query, idx) => (
          <button key={idx} type="button" onClick={() => handleQueryClick(query)} title={query} className="chip max-w-[16rem]">
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
