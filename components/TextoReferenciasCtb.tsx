import { referenciasCtb } from '@/lib/ctb/referencias';

/** Text stays escaped; links always point to the compiled CTB at Planalto. */
export default function TextoReferenciasCtb({ texto, contextoCtb = false }: { texto: string; contextoCtb?: boolean }) {
  return <>{referenciasCtb(texto, contextoCtb).map((parte, index) => parte.href
    ? <a key={index} href={parte.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-ds-primary-strong underline decoration-2 underline-offset-4 hover:text-ds-ink" aria-label={`Abrir ${parte.texto} no CTB oficial (nova aba)`} title="Conferir no CTB oficial — Planalto (nova aba)">{parte.texto}</a>
    : parte.texto)}</>;
}
