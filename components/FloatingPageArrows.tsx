'use client';

import { useEffect, useRef } from 'react';
import Icone from './ui/Icone';

interface Props {
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  previousLabel?: string;
  nextLabel?: string;
}

/** Edge controls stay translucent over text and move clear of interactive fields. */
export default function FloatingPageArrows({ onPrevious, onNext, previousDisabled = false, nextDisabled = false, previousLabel = 'Página anterior do conteúdo', nextLabel = 'Próxima página do conteúdo' }: Props) {
  const previous = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let raf = 0;
    const position = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const content = document.getElementById('conteudo');
        if (!content) return;
        const bounds = content.getBoundingClientRect();
        const controls = [...content.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,summary,[role="option"]')]
          .filter(element => !element.closest('.floating-page-arrows'))
          .flatMap(element => [...element.getClientRects()])
          .filter(rect => rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < innerWidth);
        for (const button of [previous.current, next.current]) {
          if (!button) continue;
          const rect = button.getBoundingClientRect();
          const middle = bounds.top + bounds.height / 2;
          const offsets = [0];
          for (let offset = 4; offset <= bounds.height / 2 - 28; offset += 4) offsets.push(-offset, offset);
          const candidates = offsets.map(offset => middle + offset);
          const best = candidates.find(y => !controls.some(control => control.left < rect.right + 3 && control.right > rect.left - 3 && control.top < y + 27 && control.bottom > y - 27));
          // A narrow edge rail remains usable even on exceptionally dense forms.
          const y = best ?? middle;
          button.style.setProperty('--floating-arrow-y', `${Math.round(y)}px`);
        }
      });
    };
    const content = document.getElementById('conteudo');
    const observer = new MutationObserver(position);
    if (content) observer.observe(content, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'open', 'hidden'] });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position);
    if (content) resize?.observe(content);
    window.addEventListener('resize', position);
    document.addEventListener('focusin', position);
    document.addEventListener('click', position);
    position();
    return () => { cancelAnimationFrame(raf); observer.disconnect(); resize?.disconnect(); window.removeEventListener('resize', position); document.removeEventListener('focusin', position); document.removeEventListener('click', position); };
  }, [previousDisabled, nextDisabled]);

  return <div className="floating-page-arrows print:hidden" role="group" aria-label="Navegação lateral">
    <button ref={previous} type="button" className="floating-page-arrow floating-page-arrow-previous" aria-label={previousLabel} disabled={previousDisabled} onClick={onPrevious}><Icone nome="voltar" tamanho={20} /></button>
    <button ref={next} type="button" className="floating-page-arrow floating-page-arrow-next" aria-label={nextLabel} disabled={nextDisabled} onClick={onNext}><Icone nome="seta" tamanho={20} /></button>
  </div>;
}
