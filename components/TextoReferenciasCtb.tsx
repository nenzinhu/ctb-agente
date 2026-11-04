'use client';
import { useCtbReader } from './ctb/CtbReaderProvider';
import { referenciasCtb } from '@/lib/ctb/referencias';

/** Text stays escaped; links always point to the compiled CTB at Planalto. */
export default function TextoReferenciasCtb({ texto, contextoCtb = false }: { texto: string; contextoCtb?: boolean }) {
  const abrir = useCtbReader();
  return <>{referenciasCtb(texto, contextoCtb).map((parte, index) => parte.href
    ? <a key={index} href={parte.href} target={abrir ? undefined : '_blank'} onClick={event => { if (abrir && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); const n = parte.texto.replace(/^art(?:igo)?\.?\s*/i, ''); abrir(n); } }} rel="noopener noreferrer" className="font-semibold text-ds-primary-strong underline decoration-2 underline-offset-4 hover:text-ds-ink" aria-label={abrir ? `Abrir ${parte.texto} no aplicativo` : `Abrir ${parte.texto} no CTB oficial (nova aba)`} title={abrir ? 'Ler artigo e conferir a fonte' : 'Conferir no CTB oficial — Planalto (nova aba)'}>{parte.texto}</a>
    : parte.texto)}</>;
}
