'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveQuery } from '@/lib/search/local-storage';
import TurnstileWidget, { turnstileConfigurado } from './TurnstileWidget';
import BotaoVoz from './BotaoVoz';

interface ConsultaFormProps {
  autoFocus?: boolean;
}

export const TURNSTILE_STORAGE_KEY = 'ctb-turnstile-token';

/** Same ceiling the API enforces, so the limit is felt before the request. */
export const LIMITE_CONSULTA = 1000;

export default function ConsultaForm({ autoFocus = false }: ConsultaFormProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const texto = query.trim();
    if (!texto) return;

    if (texto.length > LIMITE_CONSULTA) {
      setErro(`Consulta muito longa: o limite é de ${LIMITE_CONSULTA} caracteres.`);
      return;
    }

    if (turnstileConfigurado && !token) {
      setErro('Aguarde a verificação anti-bot e tente novamente.');
      return;
    }

    setErro(null);
    setLoading(true);
    saveQuery(texto);

    try {
      if (token) {
        sessionStorage.setItem(TURNSTILE_STORAGE_KEY, token);
      } else {
        sessionStorage.removeItem(TURNSTILE_STORAGE_KEY);
      }
    } catch {
      // sessionStorage unavailable: the request is still sent without a token
    }

    router.push(`/consulta?q=${encodeURIComponent(texto)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="consulta"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Sua consulta
        </label>
        <textarea
          id="consulta"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: 516-91 ou art. 165 ou dirigir acima do limite de velocidade"
          maxLength={LIMITE_CONSULTA}
          autoFocus={autoFocus}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-ctb-green focus:border-transparent resize-none"
          rows={4}
        />
      </div>

      <BotaoVoz
        onTranscricao={(texto) => {
          setQuery((atual) => (atual ? `${atual} ${texto}` : texto));
          setErro(null);
        }}
      />

      <TurnstileWidget onToken={setToken} />

      {erro && (
        <p className="text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}

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
