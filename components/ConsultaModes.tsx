import Link from 'next/link';
import Icone from './ui/Icone';

/** Visible shortcuts keep the consultation modes easy to distinguish. */
export default function ConsultaModes({ atual }: { atual: 'ctb' | 'pop' | 'guiado' }) {
  return (
    <nav aria-label="Tipo de consulta" className="consultation-modes">
      <Link href="/" className="consultation-mode" aria-current={atual === 'ctb' ? 'page' : undefined}>
        <Icone nome="balanca" tamanho={21} className="shrink-0" />
        <span className="min-w-0">
          <span className="block font-semibold leading-tight sm:text-sm">Consulta CTB</span>
          <span className="mt-0.5 hidden text-xs text-ds-subtle sm:block">Infrações e artigos</span>
        </span>
      </Link>
      <Link href="/pop" className="consultation-mode" aria-current={atual === 'pop' ? 'page' : undefined}>
        <Icone nome="escudo" tamanho={21} className="shrink-0" />
        <span className="min-w-0">
          <span className="block font-semibold leading-tight sm:text-sm">POP-PMSC</span>
          <span className="mt-0.5 hidden text-xs text-ds-subtle sm:block">Procedimentos operacionais</span>
        </span>
      </Link>
      <Link href="/enquadramento" className="consultation-mode" aria-current={atual === 'guiado' ? 'page' : undefined}>
        <Icone nome="check" tamanho={21} className="shrink-0" />
        <span className="min-w-0">
          <span className="block font-semibold leading-tight sm:text-sm">Enquadramento guiado</span>
          <span className="mt-0.5 hidden text-xs text-ds-subtle sm:block">Compare fichas por critérios</span>
        </span>
      </Link>
    </nav>
  );
}
