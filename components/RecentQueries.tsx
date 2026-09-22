'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRecentQueries, clearRecentQueries, saveQuery } from '@/lib/search/local-storage';

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
    <div className="mt-8">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Consultas recentes
        </h3>
        <button
          onClick={handleClear}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
        >
          Limpar
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((query, idx) => (
          <button
            key={idx}
            onClick={() => handleQueryClick(query)}
            title={query}
            className="max-w-[16rem] truncate px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-ctb-green/20 transition-colors"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
