'use client';

import { setScrollReading, useScrollReading } from '@/lib/client/reading-mode';
import Icone from './ui/Icone';

export default function ReadingModeToggle({ panel = false }: { panel?: boolean }) {
  const scroll = useScrollReading();
  if (panel) return <div className="reading-mode-panel" role="group" aria-label="Modo de leitura do conteúdo">
    <span>Conteúdo central</span>
    <div>
      <button type="button" aria-label="Ler conteúdo por páginas" aria-pressed={!scroll} onClick={() => setScrollReading(false)}>Por páginas</button>
      <button type="button" aria-label="Rolar conteúdo central" aria-pressed={scroll} onClick={() => setScrollReading(true)}>Rolar texto</button>
    </div>
  </div>;
  return <button type="button" className="header-pill reading-mode-toggle" aria-label="Rolar texto" aria-pressed={scroll} title={scroll ? 'Voltar à leitura por páginas' : 'Ativar rolagem do texto'} onClick={() => setScrollReading(!scroll)}><Icone nome="lista" tamanho={16} className="hidden sm:block" /><span>Rolar texto</span></button>;
}
