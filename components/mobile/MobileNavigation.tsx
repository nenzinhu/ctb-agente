'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icone from '@/components/ui/Icone';

export default function MobileNavigation() {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/admin')) return null;

  const buscaAtiva = pathname === '/' || pathname.startsWith('/consulta');
  const pesosAtivo = pathname === '/pesos-dimensoes' || pathname.startsWith('/pesos-dimensoes/');
  const estrangeirosAtivo = pathname === '/estrangeiros' || pathname.startsWith('/estrangeiros/');
  const favoritosAtivo = pathname === '/favoritos' || pathname.startsWith('/favoritos/');

  return (
    <>
      <nav className="mobile-nav mobile-nav-compact print:hidden md:hidden" aria-label="Navegação mobile">
        <Link href="/" className="mobile-nav-action" aria-current={buscaAtiva ? 'page' : undefined}>
          <Icone nome="busca" tamanho={20} /><span>Buscar</span>
        </Link>
        <Link href="/pesos-dimensoes" className="mobile-nav-action" aria-current={pesosAtivo ? 'page' : undefined}>
          <Icone nome="balanca" tamanho={20} /><span>Pesos</span>
        </Link>
        <Link href="/estrangeiros" className="mobile-nav-action" aria-current={estrangeirosAtivo ? 'page' : undefined}>
          <Icone nome="globo" tamanho={20} /><span>Estrangeiros</span>
        </Link>
        <Link href="/favoritos" className="mobile-nav-action" aria-current={favoritosAtivo ? 'page' : undefined}>
          <Icone nome="estrela" tamanho={20} /><span>Favoritos</span>
        </Link>
      </nav>
    </>
  );
}
