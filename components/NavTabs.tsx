'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { destinoAtivo, ferramentaAtiva, NAVEGACAO_PRINCIPAL } from '@/lib/navigation';
import Icone from './ui/Icone';

export default function NavTabs() {
  const pathname = usePathname() ?? '/';
  return <nav aria-label="Navegação principal"><ul className="nav-tabs nav-tabs-compact">
    {NAVEGACAO_PRINCIPAL.map(item => <li key={item.href}><Link href={item.href} aria-current={destinoAtivo(item.href, pathname) ? 'page' : undefined} className="nav-tab"><Icone nome={item.icone} tamanho={18} /><span>{item.label}</span></Link></li>)}
    <li><Link href="/ferramentas" aria-current={pathname === '/ferramentas' || ferramentaAtiva(pathname) ? 'page' : undefined} className="nav-tab"><Icone nome="lista" tamanho={18} /><span>Ferramentas</span></Link></li>
  </ul></nav>;
}
