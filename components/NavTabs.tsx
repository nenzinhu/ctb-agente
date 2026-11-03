'use client';

import Link from 'next/link';
import TabCarousel from '@/components/TabCarousel';
import { usePathname } from 'next/navigation';
import { ABAS_ADICIONAIS, destinoAtivo, ferramentaAtiva, NAVEGACAO_PRINCIPAL } from '@/lib/navigation';

export default function NavTabs() {
  const pathname = usePathname() ?? '/';
  return <nav aria-label="Navegação principal"><TabCarousel activeKey={pathname}>
    {NAVEGACAO_PRINCIPAL.map(item => <Link key={item.href} href={item.href} aria-current={destinoAtivo(item.href, pathname) ? 'page' : undefined} className="nav-tab pmrv-tab"><span>{item.label}</span></Link>)}
    <Link href="/ferramentas" aria-current={pathname === '/ferramentas' || (ferramentaAtiva(pathname) && !ABAS_ADICIONAIS.some(item => destinoAtivo(item.href, pathname))) ? 'page' : undefined} className="nav-tab pmrv-tab"><span>Ferramentas</span></Link>
  {ABAS_ADICIONAIS.map(item => <Link key={item.href} href={item.href} aria-current={destinoAtivo(item.href, pathname) ? 'page' : undefined} className="nav-tab pmrv-tab"><span>{item.label}</span></Link>)}
  </TabCarousel></nav>;
}
