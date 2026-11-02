'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Icone, { type NomeIcone } from './ui/Icone';

export interface ItemNav {
  href: string;
  label: string;
  /** Shorter label for phones */
  curto: string;
  icone: NomeIcone;
  /** Other paths that belong to this section */
  tambem?: string[];
}

function ativo(item: ItemNav, pathname: string): boolean {
  if (item.href === '/') return pathname === '/' || (item.tambem ?? []).some((p) => pathname.startsWith(p));
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Desktop section pills keep the active destination in view. Compact mobile
 * shortcuts use a fixed grid so every quick consultation remains visible.
 */
export default function NavTabs({ itens, compacto = false }: { itens: ItemNav[]; compacto?: boolean }) {
  const pathname = usePathname() ?? '/';
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const lista = listaRef.current;
    const atual = lista?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!lista || !atual || lista.scrollWidth <= lista.clientWidth) return;
    lista.scrollLeft = atual.offsetLeft - (lista.clientWidth - atual.offsetWidth) / 2;
  }, [pathname]);

  return (
    <div role={compacto ? undefined : "navigation"} aria-label={compacto ? undefined : "Navegação principal"}>
      <ul ref={listaRef} className={compacto ? "mobile-quick-links" : "nav-tabs nav-tabs-compact"}>
        {itens.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={ativo(item, pathname) ? 'page' : undefined}
              className="nav-tab"
            >
              <Icone nome={item.icone} tamanho={16} className="shrink-0" />
              <span>{compacto && item.href === "/" ? "Consulta CTB" : compacto && item.href === "/pop" ? "POPs" : item.curto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
