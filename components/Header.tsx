import Link from 'next/link';
import InstalarApp from './InstalarApp';
import NavTabs, { type ItemNav } from './NavTabs';
import TemaEscuroToggle from './TemaEscuroToggle';
import TemaToggle from './TemaToggle';
import Icone from './ui/Icone';

const SECOES: ItemNav[] = [
  { href: '/', label: 'Consulta CTB', curto: 'Consulta', icone: 'busca', tambem: ['/consulta'] },
  { href: '/pop', label: 'POP-PMSC', curto: 'POP', icone: 'escudo' },
  { href: '/professor', label: 'Professor Emérito', curto: 'Emérito', icone: 'professor' },
  { href: '/favoritos', label: 'Favoritos', curto: 'Favoritos', icone: 'estrela' },
  { href: '/gerador-pdf', label: 'Dossiê PDF', curto: 'Dossiê', icone: 'arquivo' },
  { href: '/apostila', label: 'Apostila IA', curto: 'Apostila', icone: 'livro' },
  { href: '/comprimir-pdf', label: 'Comprimir PDF', curto: 'Comprimir', icone: 'comprimir' },
];

/**
 * Sticky header in two strips: brand and utility pills on top, section tabs
 * below. Server component; only the interactive pieces ship JavaScript.
 */
export default function Header() {
  return (
    <header className="ds-header sticky top-0 z-40 print:hidden">
      <div className="mx-auto flex h-[52px] max-w-6xl items-center gap-2 px-4 sm:h-14 sm:gap-3 sm:px-6">
        <Link href="/" aria-label="CTB Agente — início" className="flex min-w-0 items-center gap-2.5 rounded-control">
          {/* Decorative: the link's aria-label already names it */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brasao-cpmrv.png" alt="" width={38} height={48} className="h-11 w-auto shrink-0 drop-shadow sm:h-12" />
          <span className="min-w-0">
            <span className="header-title block">
              <span className="text-ds-accent">CTB</span> Agente
            </span>
            <span className="header-sub hidden sm:block">Trânsito · POP-PMSC</span>
          </span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <InstalarApp />
          <TemaEscuroToggle />
          <TemaToggle />
          {/* The panel is behind the auth middleware: prefetching it while the
              visitor is anonymous caches the redirect to /admin/login in the
              client router, and the stale entry then swallows the navigation
              right after a successful login. */}
          <Link href="/admin" prefetch={false} aria-label="Painel master" title="Painel master" className="header-pill">
            <Icone nome="engrenagem" tamanho={17} />
            <span className="hidden lg:inline">Painel</span>
          </Link>
        </div>
      </div>

      <div className="header-strip">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <NavTabs itens={SECOES} />
        </div>
      </div>
    </header>
  );
}
