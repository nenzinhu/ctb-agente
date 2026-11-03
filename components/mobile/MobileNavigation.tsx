'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icone from '@/components/ui/Icone';
import { destinoAtivo, ferramentaAtiva, NAVEGACAO_PRINCIPAL } from '@/lib/navigation';

export default function MobileNavigation() {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/admin')) return null;
  return <nav className="mobile-nav mobile-nav-compact print:hidden md:hidden" aria-label="Navegação mobile">
    {NAVEGACAO_PRINCIPAL.map((item, index) => <Link key={item.href} href={item.href} className="mobile-nav-action" aria-current={destinoAtivo(item.href, pathname) ? 'page' : undefined}><Icone nome={item.icone} tamanho={20} /><span>{index === 0 ? 'Consultar' : index === 1 ? 'POPs' : 'Salvos'}</span></Link>)}
    <Link href="/ferramentas" className="mobile-nav-action" aria-current={pathname === '/ferramentas' || ferramentaAtiva(pathname) ? 'page' : undefined}><Icone nome="lista" tamanho={20} /><span>Ferramentas</span></Link>
  </nav>;
}
