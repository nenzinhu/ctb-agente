'use client';
import { useEffect, useRef, useId, type ReactNode } from 'react';
export default function AppDialog({ open, onClose, title, children, closeLabel = 'Voltar à consulta' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; closeLabel?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); else if (!open && dialog.current?.open) dialog.current.close(); }, [open]);
  return <dialog ref={dialog} className="app-dialog" aria-labelledby={titleId} onClose={onClose} onCancel={event => { event.preventDefault(); dialog.current?.close(); }}>
    <header className="app-dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="btn-secondary" onClick={() => dialog.current?.close()}>{closeLabel}</button></header>
    <div className="app-dialog-body">{children}</div>
  </dialog>;
}
