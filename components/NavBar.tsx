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
 * Header institucional da Policia Militar Rodovia de Santa Catarina (PMRV-SC).
 * Logo em src/app/public/logo-pmrv-sc.png (brasão oficial + nome integral).
 */
export default function NavBar() {
  const pathname = usePathname() ?? '/';

  return (
    <>
      {/* ===== HEADER ===== */}
      <header className="header">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          {/* Logo + Nome PMRV-SC */}
          <Link
            href="/"
            className="header-logo group rounded-lg transition-colors hover:bg-primary-soft"
            aria-label="Policia Militar Rodovia de Santa Catarina — inicio"
          >
            {/* Brasão oficial — imagem PNG com transparente */}
            <img
              src="/logo-pmrv-sc.png"
              alt="Brasão da Policia Militar Rodovia de Santa Catarina"
              className="header-logo-img"
              loading="eager"
              draggable={false}
            />
            <span className="header-logo-text">
              <span className="block">Policia Militar</span>
              <span className="block text-[11px] text-muted sm:block">Rodovia de Santa Catarina</span>
            </span>
          </Link>

          {/* Nav desktop */}
          <nav aria-label="Navegacao principal" className="ml-2 hidden flex-1 lg:block">
            <ul className="flex items-center gap-1">
              {LINKS.map((item) => {
                const atual = ativo(item, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={atual ? 'page' : undefined}
                      className={`header-nav-link uppercase ${
                        atual
                          ? 'header-nav-link-ativo'
                          : 'header-nav-link-inativo'
                      }`}
                    >
                      <Icone nome={item.icone} tamanho={18} />
                      <span className="xl:hidden">{item.curto}</span>
                      <span className="hidden xl:inline">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Acoes direita */}
          <div className="ml-auto flex items-center gap-1.5">
            <TemaToggle />
            <Link
              href="/admin"
              prefetch={false}
              className="header-nav-link-inativo hidden items-center gap-1.5 rounded-full px-3 text-sm lg:inline-flex"
              aria-label="Painel master"
              title="Painel master"
            >
              <Icone nome="engrenagem" tamanho={18} />
              <span className="hidden lg:inline">Painel</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== BOTTOM BAR (celular) ===== */}
      <nav
        aria-label="Navegacao principal (celular)"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {LINKS.map((item) => {
            const atual = ativo(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={atual ? 'page' : undefined}
                  className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase ${
                    atual ? 'text-primary' : 'text-muted'
                  }`}
                >
                  {atual && (
                    <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary-accent" aria-hidden />
                  )}
                  <Icone nome={item.icone} tamanho={22} />
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
