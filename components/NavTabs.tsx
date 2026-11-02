'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { destinoAtivo, ferramentaAtiva, NAVEGACAO_PRINCIPAL } from '@/lib/navigation';
import Icone from './ui/Icone';
import ToolGroups from './ToolGroups';

export default function NavTabs() {
  const pathname = usePathname() ?? '/';
  const menuRef = useRef<HTMLDetailsElement>(null);
  const fechar = () => { if (menuRef.current) menuRef.current.open = false; };

  useEffect(() => { if (menuRef.current) menuRef.current.open = false; }, [pathname]);

  useEffect(() => {
    const fecharFora = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) fechar();
    };
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !menuRef.current?.open) return;
      fechar();
      menuRef.current.querySelector('summary')?.focus();
    };
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 768px)') : null;
    const aoMudarTela = () => { if (!media?.matches) fechar(); };
    document.addEventListener('pointerdown', fecharFora);
    document.addEventListener('keydown', fecharComEscape);
    media?.addEventListener('change', aoMudarTela);
    return () => {
      document.removeEventListener('pointerdown', fecharFora);
      document.removeEventListener('keydown', fecharComEscape);
      media?.removeEventListener('change', aoMudarTela);
    };
  }, []);

  return (
    <nav aria-label="Navegação principal" className="relative">
      <ul className="nav-tabs nav-tabs-compact">
        {NAVEGACAO_PRINCIPAL.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={destinoAtivo(item.href, pathname) ? 'page' : undefined} className="nav-tab">
              <Icone nome={item.icone} tamanho={18} /><span>{item.label}</span>
            </Link>
          </li>
        ))}
        <li>
          <details ref={menuRef} className="desktop-tools">
            <summary className="nav-tab" data-active={ferramentaAtiva(pathname) || undefined}>
              <Icone nome="lista" tamanho={18} /><span>Ferramentas</span>
              <Icone nome="chevron" tamanho={14} className="tools-chevron" />
            </summary>
            <div className="desktop-tools-panel">
              <ToolGroups pathname={pathname} onNavigate={fechar} />
              <Link href="/#consultas-recentes" onClick={fechar} className="tools-recent">
                <Icone nome="relogio" tamanho={18} /> Consultas recentes
              </Link>
            </div>
          </details>
        </li>
      </ul>
    </nav>
  );
}
