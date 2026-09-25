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
 * Section tabs in the header's second strip. On phones the strip scrolls
 * sideways, so the current section is kept in view.
 */
export default function NavTabs({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname() ?? '/';
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const lista = listaRef.current;
    const atual = lista?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!lista || !atual || lista.scrollWidth <= lista.clientWidth) return;
    lista.scrollLeft = atual.offsetLeft - (lista.clientWidth - atual.offsetWidth) / 2;
  }, [pathname]);

  return (
    <nav aria-label="Navegação principal">
      <ul ref={listaRef} className="nav-tabs">
        {itens.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link href={item.href} aria-current={ativo(item, pathname) ? 'page' : undefined} className="nav-tab">
              <Icone nome={item.icone} tamanho={16} className="shrink-0" />
              <span className="md:hidden">{item.curto}</span>
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
