'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Icone, { type NomeIcone } from './ui/Icone';

type Pilar = {
  id: string;
  label: string;
  icone: NomeIcone;
  itens: Array<{ href: string; label: string; icone: NomeIcone; tambem?: string[] }>;
};

const PILARES: Pilar[] = [
  {
    id: 'fiscalizacao', label: 'Fiscalização', icone: 'busca', itens: [
      { href: '/', label: 'Consulta CTB e MBFT', icone: 'busca', tambem: ['/consulta'] },
      { href: '/fatos-pmsc', label: 'Fatos PMSC', icone: 'arquivo' },
    ],
  },
  { id: 'pesos', label: 'Pesos', icone: 'balanca', itens: [{ href: '/pesos-dimensoes', label: 'Pesos e dimensões', icone: 'balanca' }] },
  { id: 'estrangeiros', label: 'Estrangeiros', icone: 'globo', itens: [{ href: '/estrangeiros', label: 'Checklist e regras internacionais', icone: 'globo' }] },
  {
    id: 'procedimentos', label: 'Procedimentos', icone: 'escudo', itens: [
      { href: '/pop', label: 'POPs PMSC', icone: 'escudo' },
      { href: '/casos', label: 'Casos práticos', icone: 'check' },
    ],
  },
  {
    id: 'utilitarios', label: 'Utilitários e IA', icone: 'engrenagem', itens: [
      { href: '/professor', label: 'Professor CTB', icone: 'professor' },
      { href: '/apostila', label: 'Gerar apostila', icone: 'livro' },
      { href: '/comprimir-pdf', label: 'Comprimir PDF', icone: 'comprimir' },
    ],
  },
];

function corresponde(href: string, pathname: string, tambem: string[] = []) {
  if (href === '/') return pathname === '/' || tambem.some((item) => pathname.startsWith(item));
  return pathname === href || pathname.startsWith(`${href}/`);
}

function pilarAtivo(pilar: Pilar, pathname: string) {
  return pilar.itens.some((item) => corresponde(item.href, pathname, item.tambem));
}

export default function OperationalNavigation() {
  const pathname = usePathname() ?? '/';
  const [aberto, setAberto] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setAberto(PILARES.find((pilar) => pilarAtivo(pilar, pathname))?.id ?? null);
  }, [pathname]);

  useEffect(() => {
    const fechar = (evento: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(evento.target as Node)) setAberto(null);
    };
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, []);

  const pilarAberto = PILARES.find((pilar) => pilar.id === aberto) ?? null;

  return (
    <nav ref={navRef} aria-label="Pilares operacionais" className="operational-navigation">
      <ul className="operational-pillars">
        {PILARES.map((pilar) => {
          const ativo = pilarAtivo(pilar, pathname);
          const expandido = aberto === pilar.id;
          return (
            <li key={pilar.id} className="operational-pillar">
              <button
                type="button"
                className="operational-pillar-trigger"
                aria-expanded={expandido}
                aria-controls={`submenu-${pilar.id}`}
                aria-current={ativo ? 'page' : undefined}
                onClick={() => setAberto((atual) => atual === pilar.id ? null : pilar.id)}
              >
                <Icone nome={pilar.icone} tamanho={18} />
                <span>{pilar.label}</span>
                <Icone nome="chevron" tamanho={15} className={expandido ? 'rotate-180' : ''} />
              </button>
            </li>
          );
        })}
      </ul>
      {pilarAberto && (
          <ul id={`submenu-${pilarAberto.id}`} className="operational-submenu">
            {pilarAberto.itens.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={corresponde(item.href, pathname, item.tambem) ? 'page' : undefined}
                  className="operational-submenu-link"
                  onClick={() => setAberto(null)}
                >
                  <Icone nome={item.icone} tamanho={19} />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
      )}
    </nav>
  );
}
