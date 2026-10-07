import Link from 'next/link';
import Icone from './ui/Icone';

/** Visible shortcuts keep the two consultation collections easy to distinguish. */
export default function ConsultaModes({ atual }: { atual: 'ctb' | 'pop' }) {
  return (
    <nav aria-label="Tipo de consulta" className="consultation-modes">
      <Link href="/" className="consultation-mode" aria-current={atual === 'ctb' ? 'page' : undefined}>
        <Icone nome="balanca" tamanho={21} className="shrink-0" />
        <span className="min-w-0">
          <span className="block font-semibold">Consulta CTB</span>
          <span className="mt-0.5 block text-xs text-ds-subtle">Infrações e artigos</span>
        </span>
      </Link>
      <Link href="/pop" className="consultation-mode" aria-current={atual === 'pop' ? 'page' : undefined}>
        <Icone nome="escudo" tamanho={21} className="shrink-0" />
        <span className="min-w-0">
          <span className="block font-semibold">POP-PMSC</span>
          <span className="mt-0.5 block text-xs text-ds-subtle">Procedimentos operacionais</span>
        </span>
      </Link>
    </nav>
  );
}
