'use client';

import { useEffect, useState } from 'react';
import Icone from './ui/Icone';

/** "1" dark, "0" light; absent means "follow the system". Also read by app/layout.tsx before the first paint. */
export const CHAVE_ESCURO = 'ctb-escuro';

const CONSULTA_SISTEMA = '(prefers-color-scheme: dark)';

/**
 * Read the agent's explicit choice, tolerating private-mode storage failures
 * @returns true/false when chosen, null when the system decides
 */
function lerEscolha(): boolean | null {
  try {
    const salvo = localStorage.getItem(CHAVE_ESCURO);
    return salvo === '1' ? true : salvo === '0' ? false : null;
  } catch {
    return null;
  }
}

/**
 * Toggle the `.dark` class the design tokens react to
 * @param ativo - Whether the dark theme should be on
 */
export function aplicarEscuro(ativo: boolean): void {
  document.documentElement.classList.toggle('dark', ativo);
}

/**
 * Header pill between the light and dark themes. Until the agent picks one,
 * the theme follows the system. Hidden in "modo sol", which is always light.
 */
export default function TemaEscuroToggle() {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const sistema = typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA_SISTEMA) : null;
    const inicial = lerEscolha() ?? Boolean(sistema?.matches);
    aplicarEscuro(inicial);
    setEscuro(inicial);

    const aoMudarSistema = (evento: MediaQueryListEvent) => {
      if (lerEscolha() !== null) return;
      aplicarEscuro(evento.matches);
      setEscuro(evento.matches);
    };
    sistema?.addEventListener('change', aoMudarSistema);
    return () => sistema?.removeEventListener('change', aoMudarSistema);
  }, []);

  const alternar = () => {
    const proximo = !escuro;
    aplicarEscuro(proximo);
    setEscuro(proximo);
    try {
      localStorage.setItem(CHAVE_ESCURO, proximo ? '1' : '0');
    } catch {
      // Storage unavailable: the choice lasts for this session only
    }
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={escuro}
      aria-label="Modo escuro"
      title={escuro ? 'Voltar ao tema claro' : 'Usar o tema escuro'}
      className="header-pill oculto-no-sol"
    >
      <Icone nome="lua" tamanho={17} />
      <span className="hidden md:inline">Escuro</span>
    </button>
  );
}
