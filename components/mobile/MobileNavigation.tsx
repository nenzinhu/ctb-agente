'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icone, { type NomeIcone } from '@/components/ui/Icone';
import BottomSheet from './BottomSheet';

const FERRAMENTAS: Array<{ href: string; label: string; descricao: string; icone: NomeIcone }> = [
  { href: '/enquadramento', label: 'Enquadramento guiado', descricao: 'Confira alternativas passo a passo', icone: 'lista' },
  { href: '/pop', label: 'Consultar POPs', descricao: 'Procedimentos operacionais', icone: 'escudo' },
  { href: '/fatos-pmsc', label: 'Lista de Fatos PMSC', descricao: 'Naturezas e potencial ofensivo', icone: 'arquivo' },
  { href: '/pesos-dimensoes', label: 'Pesos e Dimensões', descricao: 'PBT, PBTC, CMT e excesso de peso', icone: 'balanca' },
  { href: '/professor', label: 'Professor Emérito', descricao: 'Explique e compare situações', icone: 'professor' },
  { href: '/apostila', label: 'Apostila IA', descricao: 'Material para estudo', icone: 'livro' },
  { href: '/gerador-pdf', label: 'Ferramentas de PDF', descricao: 'Gerar ou comprimir documentos', icone: 'comprimir' },
];

function SheetLink({ href, label, descricao, icone, onClick }: typeof FERRAMENTAS[number] & { onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="mobile-sheet-link">
      <span className="mobile-sheet-link-icon"><Icone nome={icone} tamanho={21} /></span>
      <span><strong>{label}</strong><small>{descricao}</small></span>
      <Icone nome="chevron" tamanho={17} className="ml-auto -rotate-90" />
    </Link>
  );
}

export default function MobileNavigation() {
  const pathname = usePathname() ?? '/';
  const [sheet, setSheet] = useState<'ferramentas' | 'mais' | null>(null);
  const ferramentasRef = useRef<HTMLButtonElement>(null);
  const maisRef = useRef<HTMLButtonElement>(null);
  const fechar = useCallback(() => setSheet(null), []);

  useEffect(() => setSheet(null), [pathname]);
  if (pathname.startsWith('/admin')) return null;

  const buscaAtiva = pathname === '/' || pathname.startsWith('/consulta');
  const ferramentasAtiva = FERRAMENTAS.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  const favoritosAtivo = pathname === '/favoritos' || pathname.startsWith('/favoritos/');

  return (
    <>
      <nav className="mobile-nav print:hidden md:hidden" aria-label="Navegação mobile">
        <Link href="/" className="mobile-nav-action" aria-current={buscaAtiva ? 'page' : undefined}>
          <Icone nome="busca" tamanho={22} /><span>Buscar</span>
        </Link>
        <button ref={ferramentasRef} type="button" className="mobile-nav-action" aria-expanded={sheet === 'ferramentas'} aria-current={ferramentasAtiva ? 'page' : undefined} onClick={() => setSheet('ferramentas')}>
          <Icone nome="lista" tamanho={22} /><span>Ferramentas</span>
        </button>
        <Link href="/favoritos" className="mobile-nav-action" aria-current={favoritosAtivo ? 'page' : undefined}>
          <Icone nome="estrela" tamanho={22} /><span>Favoritos</span>
        </Link>
        <button ref={maisRef} type="button" className="mobile-nav-action" aria-expanded={sheet === 'mais'} onClick={() => setSheet('mais')}>
          <Icone nome="engrenagem" tamanho={22} /><span>Mais</span>
        </button>
      </nav>

      <BottomSheet title="Ferramentas" open={sheet === 'ferramentas'} onClose={fechar} triggerRef={ferramentasRef}>
        <div className="grid gap-2">{FERRAMENTAS.map((item) => <SheetLink key={item.href} {...item} onClick={fechar} />)}</div>
      </BottomSheet>
      <BottomSheet title="Mais opções" open={sheet === 'mais'} onClose={fechar} triggerRef={maisRef}>
        <div className="grid gap-2">
          <SheetLink href="/" label="Início" descricao="Voltar à busca principal" icone="busca" onClick={fechar} />
          <SheetLink href="/#consultas-recentes" label="Consultas recentes" descricao="Retomar uma pesquisa" icone="relogio" onClick={fechar} />
          <SheetLink href="/comprimir-pdf" label="Comprimir PDF" descricao="Reduzir arquivos no aparelho" icone="comprimir" onClick={fechar} />
        </div>
      </BottomSheet>
    </>
  );
}
