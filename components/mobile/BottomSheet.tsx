'use client';

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import Icone from '@/components/ui/Icone';

interface BottomSheetProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

export default function BottomSheet({ title, open, onClose, children, triggerRef }: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('.mobile-sheet-content a[href], .mobile-sheet-content button:not([disabled])')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        queueMicrotask(() => triggerRef.current?.focus());
      }
      if (event.key !== 'Tab' || !panel) return;
      const focaveis = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focaveis.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open, triggerRef]);

  if (!open) return null;
  const fechar = () => {
    onClose();
    queueMicrotask(() => triggerRef.current?.focus());
  };

  return (
    <div className="mobile-sheet-layer md:hidden">
      <button data-testid="bottom-sheet-backdrop" aria-label="Fechar painel" className="mobile-sheet-backdrop" onClick={fechar} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="mobile-sheet">
        <div className="mobile-sheet-handle" aria-hidden="true" />
        <header className="mobile-sheet-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={fechar} className="icon-btn" aria-label={`Fechar ${title}`}>
            <Icone nome="x" tamanho={20} />
          </button>
        </header>
        <div className="mobile-sheet-content">{children}</div>
      </div>
    </div>
  );
}
