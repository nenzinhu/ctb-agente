'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { saveQuery } from '@/lib/search/local-storage';
import TurnstileWidget, { turnstileConfigurado } from './TurnstileWidget';
import BotaoVoz from './BotaoVoz';
import Icone from './ui/Icone';

interface ConsultaFormProps {
  autoFocus?: boolean;
  /** Ready-made questions shown as chips; a tap runs the consultation. */
  exemplos?: string[];
}

export const TURNSTILE_STORAGE_KEY = 'ctb-turnstile-token';

/** Same ceiling the API enforces, so the limit is felt before the request. */
export const LIMITE_CONSULTA = 1000;

export default function ConsultaForm({ autoFocus = false, exemplos = [] }: ConsultaFormProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // "Nova consulta" links land here as /?form=1: jump straight to the field.
  // Not on every visit — on a phone that would pop the keyboard over the page.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('form') === '1') campoRef.current?.focus();
  }, []);

  const consultar = (entrada: string) => {
    const texto = entrada.trim();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    consultar(query);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="consulta" className="label">
        Sua consulta
      </label>
      <div className="relative">
        <textarea
          id="consulta"
          ref={campoRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line (like a chat).
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              consultar(query);
            }
          }}
          placeholder="Ex: 516-91 ou art. 165 ou dirigir acima do limite de velocidade"
          maxLength={LIMITE_CONSULTA}
          autoFocus={autoFocus}
          enterKeyHint="search"
          rows={3}
          className="input min-h-[96px] resize-none pr-4 text-base"
          aria-describedby="consulta-dica"
        />
      </div>
      <p id="consulta-dica" className="hint">
        Código MBFT, artigo ou a situação com suas palavras. Enter para consultar.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={loading || !query.trim()} className="btn-primary flex-1 text-base">
          <Icone nome="busca" tamanho={18} />
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
        <BotaoVoz
          onTranscricao={(texto) => {
            setQuery((atual) => (atual ? `${atual} ${texto}` : texto));
            setErro(null);
          }}
        />
      </div>

      <TurnstileWidget onToken={setToken} />

      {erro && (
        <p className="text-sm font-medium text-danger" role="alert">
          {erro}
        </p>
      )}

      {exemplos.length > 0 && (
        <div className="pt-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Experimente</p>
          <div className="flex flex-wrap gap-2">
            {exemplos.map((exemplo) => (
              <button
                key={exemplo}
                type="button"
                className="chip"
                onClick={() => {
                  setQuery(exemplo);
                  consultar(exemplo);
                }}
              >
                {exemplo}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
