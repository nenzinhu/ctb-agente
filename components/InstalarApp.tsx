'use client';

import { useEffect, useState } from 'react';
import Icone from './ui/Icone';

/** Chrome's install prompt event, not in the DOM typings. */
interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * "Instalar" header pill. It only appears when the browser offers to install
 * the PWA, and replaces the browser's own install banner.
 */
export default function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalacao | null>(null);

  useEffect(() => {
    const aoOferecer = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacao);
    };
    const aoInstalar = () => setEvento(null);

    window.addEventListener('beforeinstallprompt', aoOferecer);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoOferecer);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  if (!evento) return null;

  const instalar = async () => {
    try {
      await evento.prompt();
      await evento.userChoice;
    } finally {
      // The event can prompt only once, whatever the answer
      setEvento(null);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void instalar()}
      aria-label="Instalar o app"
      title="Instalar o CTB Agente neste aparelho"
      className="header-pill"
    >
      <Icone nome="download" tamanho={17} />
      <span className="hidden md:inline">Instalar</span>
    </button>
  );
}
