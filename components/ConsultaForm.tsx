'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { saveQuery } from '@/lib/search/local-storage';
import TurnstileWidget, { turnstileConfigurado } from './TurnstileWidget';
import BotaoVoz, { AvisoVoz, useDitado } from './BotaoVoz';
import Field from './ui/Field';
import PrimaryButton from './ui/PrimaryButton';
import SearchSuggestions from './SearchSuggestions';

interface ConsultaFormProps {
  autoFocus?: boolean;
  /** Ready-made questions shown as chips; a tap runs the consultation. */
  exemplos?: string[];
}

/** A message for the agent; `doCampo` when it is about what was typed. */
interface Erro {
  mensagem: string;
  doCampo: boolean;
}

export const TURNSTILE_STORAGE_KEY = 'ctb-turnstile-token';

/** Same ceiling the API enforces, so the limit is felt before the request. */
export const LIMITE_CONSULTA = 1000;

export default function ConsultaForm({ autoFocus = false, exemplos = [] }: ConsultaFormProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [erro, setErro] = useState<Erro | null>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const ditado = useDitado({
    onTranscricao: (texto) => {
      setQuery((atual) => (atual ? `${atual} ${texto}` : texto));
      setErro(null);
    },
  });

  // "Nova consulta" links land here as /?form=1: jump straight to the field.
  // Not on every visit — on a phone that would pop the keyboard over the page.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('form') === '1') campoRef.current?.focus();
  }, []);

  const consultar = (entrada: string) => {
    const texto = entrada.trim();
    if (!texto) return;

    if (texto.length > LIMITE_CONSULTA) {
      setErro({ mensagem: `Consulta muito longa: o limite é de ${LIMITE_CONSULTA} caracteres.`, doCampo: true });
      return;
    }

    if (turnstileConfigurado && !token) {
      setErro({ mensagem: 'Aguarde a verificação anti-bot e tente novamente.', doCampo: false });
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
    <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
      <div>
        <Field
          as="textarea"
          id="consulta"
          ref={campoRef}
          label="Sua consulta"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setErro(null);
          }}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line (like a chat).
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              consultar(query);
            }
          }}
          placeholder="Ex: 516-91, art. 165 ou motorista mexendo no celular"
          maxLength={LIMITE_CONSULTA}
          autoFocus={autoFocus}
          enterKeyHint="search"
          rows={4}
          controlClassName="mobile-query-field min-h-[108px] resize-y leading-relaxed sm:min-h-[124px]"
          hint="Use código, artigo, parte da palavra, abreviações ou gírias como “zap”, “bafom” e “doc atrasado”. Enter consulta; Shift + Enter cria uma nova linha."
          erro={erro?.doCampo ? erro.mensagem : null}
          acao={<BotaoVoz ditado={ditado} />}
        />
        <AvisoVoz ditado={ditado} />
        <SearchSuggestions
          query={query}
          fonte="ctb"
          disabled={loading}
          onSelect={(valor) => {
            setQuery(valor);
            consultar(valor);
          }}
        />
      </div>

      <PrimaryButton
        type="submit"
        icone="busca"
        carregando={loading}
        textoCarregando="Consultando..."
        disabled={!query.trim()}
        className="min-h-[48px] w-full text-base"
      >
        Consultar
      </PrimaryButton>

      <TurnstileWidget onToken={setToken} />

      {erro && !erro.doCampo && (
        <p className="field-error" role="alert">
          {erro.mensagem}
        </p>
      )}

      {exemplos.length > 0 && (
        <div className="border-t border-ds-line pt-4">
          <p className="mb-2 text-xs font-semibold text-ds-subtle">Experimente uma consulta</p>
          <div className="flex flex-wrap gap-2">
            {exemplos.map((exemplo) => (
              <button
                key={exemplo}
                type="button"
                className="chip query-example"
                disabled={loading}
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
