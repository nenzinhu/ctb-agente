'use client';

import { useEffect, useState } from 'react';
import Icone from './ui/Icone';

export type Tema = 'padrao' | 'sol';

const STORAGE_KEY = 'ctb-tema';

/**
 * Read the persisted theme, tolerating private-mode storage failures
 * @returns Stored theme, defaulting to "padrao"
 */
function lerTemaSalvo(): Tema {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'sol' ? 'sol' : 'padrao';
  } catch {
    return 'padrao';
  }
}

/**
 * Apply the theme to the document root so CSS can react to it
 * @param tema - Theme to apply
 */
export function aplicarTema(tema: Tema): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.tema = tema;
  document.documentElement.style.colorScheme = tema === 'sol' ? 'light' : '';
}

/**
 * Accessible toggle between the default palette and the sunlight / high-contrast mode
 */
export default function TemaToggle() {
  const [tema, setTema] = useState<Tema>('padrao');

  useEffect(() => {
    const salvo = lerTemaSalvo();
    setTema(salvo);
    aplicarTema(salvo);
  }, []);

  const alternar = () => {
    const proximo: Tema = tema === 'sol' ? 'padrao' : 'sol';
    setTema(proximo);
    aplicarTema(proximo);
    try {
      localStorage.setItem(STORAGE_KEY, proximo);
    } catch {
      // Storage unavailable: the toggle still works for this session
    }
  };

  const ativo = tema === 'sol';

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={ativo}
      aria-label={ativo ? 'Modo sol: ativo' : 'Modo sol'}
      title="Alto contraste para ler sob luz do sol"
      className="header-pill"
    >
      <Icone nome="sol" tamanho={17} />
      <span className="hidden md:inline">{ativo ? 'Sol: ativo' : 'Modo sol'}</span>
    </button>
  );
}
