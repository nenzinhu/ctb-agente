'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TemaToggle from './TemaToggle';
import Icone, { type NomeIcone } from './ui/Icone';

interface ItemNav {
  href: string;
  label: string;
  curto: string;
  icone: NomeIcone;
  /** Other paths that belong to this section. */
  tambem?: string[];
}

const LINKS: ItemNav[] = [
  { href: '/', label: 'Consulta CTB', curto: 'Consulta', icone: 'busca', tambem: ['/consulta'] },
  { href: '/pop', label: 'POP-PMSC', curto: 'POP', icone: 'escudo' },
  { href: '/favoritos', label: 'Favoritos', curto: 'Favoritos', icone: 'estrela' },
  { href: '/gerador-pdf', label: 'Dossiê PDF', curto: 'Dossiê', icone: 'arquivo' },
  { href: '/comprimir-pdf', label: 'Comprimir PDF', curto: 'Comprimir', icone: 'comprimir' },
];

function ativo(item: ItemNav, pathname: string): boolean {
  if (item.href === '/') return pathname === '/' || (item.tambem ?? []).some((p) => pathname.startsWith(p));
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Application shell: a top bar on every screen and, on phones, a bottom tab
 * bar within thumb reach.
 */
export default function NavBar() {
  const pathname = usePathname() ?? '/';

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70 print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="CTB Agente — início">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#1f7a52] to-[#0f3d29] text-white shadow-sm">
              <Icone nome="escudo" tamanho={20} />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-ink">CTB Agente</span>
              <span className="hidden text-[11px] text-muted sm:block">Trânsito · POP-PMSC</span>
            </span>
          </Link>

          <nav aria-label="Navegação principal" className="ml-2 hidden flex-1 lg:block">
            <ul className="flex items-center gap-1">
              {LINKS.map((item) => {
                const atual = ativo(item, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={atual ? 'page' : undefined}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        atual ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink'
                      }`}
                    >
                      <Icone nome={item.icone} tamanho={17} />
                      <span className="xl:hidden">{item.curto}</span>
                      <span className="hidden xl:inline">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <TemaToggle />
            {/* The panel is behind the auth middleware: prefetching it while the
                visitor is anonymous caches the redirect to /admin/login in the
                client router, and the stale entry then swallows the navigation
                right after a successful login. */}
            <Link
              href="/admin"
              prefetch={false}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Painel master"
              title="Painel master"
            >
              <Icone nome="engrenagem" tamanho={18} />
              <span className="hidden lg:inline">Painel</span>
            </Link>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navegação principal (celular)"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {LINKS.map((item) => {
            const atual = ativo(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={atual ? 'page' : undefined}
                  className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                    atual ? 'text-brand' : 'text-muted'
                  }`}
                >
                  {atual && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand" aria-hidden />}
                  <Icone nome={item.icone} tamanho={21} />
                  {item.curto}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
