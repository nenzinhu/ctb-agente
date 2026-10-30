'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icone, { type NomeIcone } from '@/components/ui/Icone';
import BottomSheet from './BottomSheet';

const FERRAMENTAS: Array<{ href: string; label: string; descricao: string; icone: NomeIcone }> = [
  { href: '/', label: 'Consulta CTB', descricao: 'Consultar infrações e artigos', icone: 'busca' },
  { href: '/pop', label: 'Consultar POPs', descricao: 'Procedimentos operacionais', icone: 'escudo' },
  { href: '/fatos-pmsc', label: 'Lista de Fatos PMSC', descricao: 'Naturezas e potencial ofensivo', icone: 'arquivo' },
  { href: '/pesos-dimensoes', label: 'Pesos e Dimensões', descricao: 'PBT, PBTC, CMT e excesso de peso', icone: 'balanca' },
  { href: '/estrangeiros', label: 'Condutores e Veículos Estrangeiros', descricao: 'Documentos, acordos e possíveis enquadramentos', icone: 'globo' },
  { href: '/professor', label: 'Professor Emérito', descricao: 'Explique e compare situações', icone: 'professor' },
  { href: '/apostila', label: 'Apostila IA', descricao: 'Material para estudo', icone: 'livro' },
  { href: '/casos', label: 'Casos práticos', descricao: 'Consultar situações práticas', icone: 'check' },
  { href: '/favoritos', label: 'Favoritos', descricao: 'Itens salvos no aparelho', icone: 'estrela' },
  { href: '/gerador-pdf', label: 'Gerar PDF', descricao: 'Preparar documentos', icone: 'arquivo' },
  { href: '/comprimir-pdf', label: 'Comprimir PDF', descricao: 'Reduzir arquivos no aparelho', icone: 'comprimir' },
];

function SheetLink({ href, label, descricao, icone, onClick }: typeof FERRAMENTAS[number] & { onClick: () => void }) {
  const pathname = usePathname() ?? '/';
  const ativo = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
  return (
    <Link aria-current={ativo ? 'page' : undefined} href={href} onClick={onClick} className="mobile-sheet-link">
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
  const ferramentasAtiva = FERRAMENTAS.some(({ href }) => href !== '/' && href !== '/favoritos' && (pathname === href || pathname.startsWith(`${href}/`)));
  const favoritosAtivo = pathname === '/favoritos' || pathname.startsWith('/favoritos/');

  return (
    <>
      <nav className="mobile-nav mobile-nav-compact print:hidden md:hidden" aria-label="Navegação mobile">
        <Link href="/" className="mobile-nav-action" aria-current={buscaAtiva ? 'page' : undefined}>
          <Icone nome="busca" tamanho={20} /><span>Buscar</span>
        </Link>
        <button ref={ferramentasRef} type="button" className="mobile-nav-action" aria-haspopup="dialog" aria-expanded={sheet === 'ferramentas'} aria-current={ferramentasAtiva ? 'page' : undefined} onClick={() => setSheet('ferramentas')}>
          <Icone nome="lista" tamanho={20} /><span>Todos os módulos</span>
        </button>
        <Link href="/favoritos" className="mobile-nav-action" aria-current={favoritosAtivo ? 'page' : undefined}>
          <Icone nome="estrela" tamanho={20} /><span>Favoritos</span>
        </Link>
        <button ref={maisRef} type="button" className="mobile-nav-action" aria-haspopup="dialog" aria-expanded={sheet === 'mais'} onClick={() => setSheet('mais')}>
          <Icone nome="engrenagem" tamanho={20} /><span>Recentes</span>
        </button>
      </nav>

      <BottomSheet title="Todos os módulos" open={sheet === 'ferramentas'} onClose={fechar} triggerRef={ferramentasRef}>
        <div className="grid gap-2">{FERRAMENTAS.map((item) => <SheetLink key={item.href} {...item} onClick={fechar} />)}</div>
      </BottomSheet>
      <BottomSheet title="Consultas recentes" open={sheet === 'mais'} onClose={fechar} triggerRef={maisRef}>
        <div className="grid gap-2">
          <SheetLink href="/#consultas-recentes" label="Consultas recentes" descricao="Retomar uma pesquisa" icone="relogio" onClick={fechar} />
        </div>
      </BottomSheet>
    </>
  );
}
