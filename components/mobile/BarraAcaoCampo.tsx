'use client';

import { useEffect } from 'react';
import type { Ditado } from '@/components/BotaoVoz';
import BotaoVoz from '@/components/BotaoVoz';
import Icone from '@/components/ui/Icone';
import PrimaryButton from '@/components/ui/PrimaryButton';

interface BarraAcaoCampoProps {
  /** id of the real field this bar drives */
  campoId: string;
  /** Current text, echoed so the agent knows a query is already typed */
  valor: string;
  /** Wording when the field is empty */
  placeholder: string;
  /** Accessible name of the field button / submit button */
  rotuloCampo: string;
  rotuloEnviar: string;
  enviarCarregando: string;
  enviando: boolean;
  /** False while there is nothing to send */
  podeEnviar: boolean;
  /** The real field is focused: the keyboard is open, so the bar steps aside */
  campoEmFoco: boolean;
  ditado: Ditado;
  onEnviar: () => void;
}

/**
 * Fixed query bar for phones: it does not own the query. The field button
 * moves the agent to the real textarea (focus + scroll) and the microphone and
 * submit reuse the form's own state, so there is only one query and one
 * dictation per screen. Hidden from `md` up, where the form is always in view
 * and the bottom navigation is gone.
 */
export default function BarraAcaoCampo({
  campoId,
  valor,
  placeholder,
  rotuloCampo,
  rotuloEnviar,
  enviarCarregando,
  enviando,
  podeEnviar,
  campoEmFoco,
  ditado,
  onEnviar,
}: BarraAcaoCampoProps) {
  // The bar overlaps the page, so the body needs extra bottom padding; the
  // attribute keeps that decision in the stylesheet (app/globals.css).
  useEffect(() => {
    document.body.dataset.barraAcao = '1';
    return () => {
      delete document.body.dataset.barraAcao;
    };
  }, []);

  const focarCampo = () => {
    const campo = document.getElementById(campoId);
    if (!campo) return;
    campo.scrollIntoView({ block: 'center', behavior: 'smooth' });
    (campo as HTMLTextAreaElement | HTMLInputElement).focus({ preventScroll: true });
  };

  return (
    <div className="barra-acao print:hidden md:hidden" data-oculta={campoEmFoco} role="group" aria-label={rotuloCampo}>
      <button
        type="button"
        className="barra-acao-campo"
        onClick={focarCampo}
        aria-label={valor ? `${rotuloCampo}: ${valor}` : rotuloCampo}
      >
        <Icone nome="busca" tamanho={18} className="shrink-0" />
        <span className="barra-acao-texto" data-preenchido={Boolean(valor)}>
          {valor || placeholder}
        </span>
      </button>

      <BotaoVoz ditado={ditado} grande />

      <PrimaryButton
        type="button"
        icone="seta"
        carregando={enviando}
        textoCarregando={enviarCarregando}
        disabled={!podeEnviar}
        onClick={onEnviar}
        aria-label={rotuloEnviar}
        className="min-h-[48px] shrink-0 px-4"
      >
        <span className="sr-only">{rotuloEnviar}</span>
      </PrimaryButton>
    </div>
  );
}
