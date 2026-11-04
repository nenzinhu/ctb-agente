'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DESTINOS, destinoAtivo } from '@/lib/navigation';
import Icone, { type NomeIcone } from './ui/Icone';

type Pilar = {
  id: string;
  label: string;
  icone: NomeIcone;
  itens: Array<{ href: string; label: string; icone: NomeIcone; tambem?: string[] }>;
};

const PILARES: Pilar[] = [
 {id:'fiscalizacao',label:'Fiscalização',icone:'busca'},
 {id:'pesos',label:'Pesos',icone:'balanca'},
 {id:'estrangeiros',label:'Estrangeiros',icone:'globo'},
 {id:'procedimentos',label:'Procedimentos',icone:'escudo'},
 {id:'utilitarios',label:'Utilitários e IA',icone:'engrenagem'},
].map(p=>({...p,icone:p.icone as NomeIcone,itens:DESTINOS.filter(d=>d.pilar===p.id).map(d=>({href:d.href,label:d.operacional??d.label,icone:d.icone}))}));
function corresponde(href:string,pathname:string){return destinoAtivo(href,pathname)}

function pilarAtivo(pilar: Pilar, pathname: string) {
  return pilar.itens.some((item) => corresponde(item.href, pathname));
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
                  aria-current={corresponde(item.href, pathname) ? 'page' : undefined}
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
