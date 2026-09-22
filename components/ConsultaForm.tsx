'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveQuery } from '@/lib/search/local-storage';

interface ConsultaFormProps {
  autoFocus?: boolean;
}

export default function ConsultaForm({ autoFocus = false }: ConsultaFormProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    saveQuery(query);
    router.push(`/consulta?q=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sua consulta
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: 516-91 ou art. 165 ou dirigir acima do limite de velocidade"
          autoFocus={autoFocus}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-ctb-green focus:border-transparent resize-none"
          rows={4}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="w-full bg-ctb-green hover:bg-ctb-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {loading ? 'Consultando...' : 'Consultar'}
      </button>
    </form>
  );
}
