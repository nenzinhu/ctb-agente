'use client';

import Link from 'next/link';
import TabCarousel from '@/components/TabCarousel';
import { usePathname } from 'next/navigation';
import { ABAS_ADICIONAIS, destinoAtivo, ferramentaAtiva, NAVEGACAO_PRINCIPAL } from '@/lib/navigation';

export default function MobileNavigation() {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/admin')) return null;
  return <nav className="mobile-nav mobile-nav-compact print:hidden md:hidden" aria-label="Navegação mobile"><TabCarousel activeKey={pathname}>
    {NAVEGACAO_PRINCIPAL.map((item, index) => <Link key={item.href} href={item.href} className="mobile-nav-action pmrv-tab" aria-current={destinoAtivo(item.href, pathname) ? 'page' : undefined}><span>{index === 0 ? 'Consultar' : index === 1 ? 'POPs' : 'Salvos'}</span></Link>)}
    <Link href="/ferramentas" className="mobile-nav-action pmrv-tab" aria-current={pathname === '/ferramentas' || (ferramentaAtiva(pathname) && !ABAS_ADICIONAIS.some(item => destinoAtivo(item.href, pathname))) ? 'page' : undefined}><span>Ferramentas</span></Link>
    {ABAS_ADICIONAIS.map(item => <Link key={item.href} href={item.href} aria-current={destinoAtivo(item.href, pathname) ? 'page' : undefined} className="mobile-nav-action pmrv-tab"><span>{item.label}</span></Link>)}
  </TabCarousel></nav>;
}
