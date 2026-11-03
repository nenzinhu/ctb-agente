'use client';

import { setScrollReading, useScrollReading } from '@/lib/client/reading-mode';
import Icone from './ui/Icone';

export default function ReadingModeToggle() {
  const scroll = useScrollReading();
  return <button type="button" className="header-pill reading-mode-toggle" aria-label="Rolar texto" aria-pressed={scroll} title={scroll ? 'Voltar à leitura por páginas' : 'Ativar rolagem do texto'} onClick={() => setScrollReading(!scroll)}><Icone nome="lista" tamanho={16} className="hidden sm:block" /><span>Rolar texto</span></button>;
}
