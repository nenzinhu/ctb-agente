'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icone from '@/components/ui/Icone';
import { destinoAtivo, ferramentaAtiva, NAVEGACAO_PRINCIPAL } from '@/lib/navigation';
import ToolGroups from '@/components/ToolGroups';
import BottomSheet from './BottomSheet';

export default function MobileNavigation() {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const ferramentasRef = useRef<HTMLButtonElement>(null);
  const fechar = useCallback(() => setOpen(false), []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 768px)') : null;
    const aoMudarTela = () => { if (media?.matches) setOpen(false); };
    media?.addEventListener('change', aoMudarTela);
    return () => media?.removeEventListener('change', aoMudarTela);
  }, []);

  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      <nav className="mobile-nav mobile-nav-compact print:hidden md:hidden" aria-label="Navegação mobile">
        {NAVEGACAO_PRINCIPAL.map((item, index) => (
          <Link key={item.href} href={item.href} className="mobile-nav-action" aria-current={destinoAtivo(item.href, pathname) ? 'page' : undefined}>
            <Icone nome={item.icone} tamanho={20} /><span>{index === 0 ? 'Buscar' : index === 1 ? 'POPs' : item.label}</span>
          </Link>
        ))}
        <button ref={ferramentasRef} type="button" className="mobile-nav-action" aria-haspopup="dialog" aria-expanded={open} aria-current={ferramentaAtiva(pathname) ? 'page' : undefined} onClick={() => setOpen(true)}>
          <Icone nome="lista" tamanho={20} /><span>Ferramentas</span>
        </button>
      </nav>

      <BottomSheet title="Ferramentas" open={open} onClose={fechar} triggerRef={ferramentasRef}>
        <ToolGroups pathname={pathname} onNavigate={fechar} />
        <Link href="/#consultas-recentes" onClick={fechar} className="tools-recent">
          <Icone nome="relogio" tamanho={18} /> Consultas recentes
        </Link>
      </BottomSheet>
    </>
  );
}
