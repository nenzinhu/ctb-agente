'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminUploadForm from '@/components/AdminUploadForm';
import DocumentList from '@/components/DocumentList';
import AcervoCard from '@/components/admin/AcervoCard';
import AdminEnquadramentos from '@/components/admin/AdminEnquadramentos';
import AdminProvedores from '@/components/admin/AdminProvedores';
import AdminUso from '@/components/admin/AdminUso';
import AdminLimites from '@/components/admin/AdminLimites';
import Icone, { type NomeIcone } from '@/components/ui/Icone';
import SectionCard from '@/components/ui/SectionCard';
import TitleCard from '@/components/ui/TitleCard';

/**
 * Master dashboard: document bases (CTB and POP-PMSC), enforcement codes,
 * AI providers, usage and limits
 */

interface DashboardStats {
  totalDocuments: number;
  byType: Record<string, number>;
  lastUpdated: string | null;
}

type Aba = 'documentos' | 'pop' | 'enquadramentos' | 'provedores' | 'uso' | 'limites';

const ABAS: { id: Aba; label: string; icone: NomeIcone }[] = [
  { id: 'documentos', label: 'Base CTB', icone: 'livro' },
  { id: 'pop', label: 'POP-PMSC', icone: 'escudo' },
  { id: 'enquadramentos', label: 'Enquadramentos', icone: 'lista' },
  { id: 'provedores', label: 'Provedores de IA', icone: 'faisca' },
  { id: 'uso', label: 'Uso', icone: 'relogio' },
  { id: 'limites', label: 'Limites', icone: 'engrenagem' },
];

const ROTULO_TIPO: Record<string, string> = {
  lei: 'Lei',
  resolucao: 'Resolução',
  portaria: 'Portaria',
  manual: 'Manual',
  jurisprudencia: 'Jurisprudência',
};

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <SectionCard titulo={titulo}>
      {descricao && <p className="-mt-1 mb-5 text-sm text-ds-subtle">{descricao}</p>}
      {children}
    </SectionCard>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [aba, setAba] = useState<Aba>('documentos');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/session');
        if (!response.ok) {
          router.push('/admin/login');
          return;
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Session check error:', error);
        router.push('/admin/login');
      }
    };

    checkSession();
  }, [router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          setStats(await response.json());
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (!isLoading) {
      fetchStats();
    }
  }, [isLoading, refreshTrigger]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      // Full reload so the client router drops the cached, authenticated
      // payloads it fetched while the session was still valid.
      window.location.assign('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const atualizar = () => setRefreshTrigger((prev) => prev + 1);

  if (isLoading) {
    return (
      <main className="page" role="status">
        <span className="sr-only">Carregando…</span>
        <div className="skeleton h-10 w-64" />
        <div className="skeleton mt-6 h-40" />
      </main>
    );
  }

  return (
    <main className="page max-w-6xl">
      <TitleCard
        titulo="Painel Master"
        icone="engrenagem"
        subtitulo="Bases de documentos, enquadramentos, provedores de IA, uso e limites."
      >
        <button type="button" onClick={handleLogout} className="btn-secondary btn-sm mt-4">
          <Icone nome="sair" tamanho={16} />
          Sair
        </button>
      </TitleCard>

      <nav className="-mx-4 mt-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Seções do painel">
        <ul className="tabs w-max">
          {ABAS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setAba(item.id)}
                aria-current={aba === item.id ? 'page' : undefined}
                className={`tab ${aba === item.id ? 'tab-active' : ''}`}
              >
                <Icone nome={item.icone} tamanho={16} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 space-y-6">
        {aba === 'documentos' && (
          <>
            {stats && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="stat bg-ds-surface">
                  <dt className="stat-label">Trechos do CTB</dt>
                  <dd className="stat-value">{stats.totalDocuments.toLocaleString('pt-BR')}</dd>
                </div>
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="stat bg-ds-surface">
                    <dt className="stat-label">{ROTULO_TIPO[type] ?? type}</dt>
                    <dd className="stat-value">{count.toLocaleString('pt-BR')}</dd>
                  </div>
                ))}
              </dl>
            )}

            <Secao
              titulo="Acervo incluído no app"
              descricao="Documentos que já vêm com o CTB Agente. Um clique coloca o texto na base de consulta."
            >
              <AcervoCard onIndexado={atualizar} />
            </Secao>

            <Secao
              titulo="Enviar documentos"
              descricao="Leis, resoluções, portarias e manuais. A indexação corta por artigo e mantém só a redação vigente."
            >
              <AdminUploadForm colecao="ctb" onUploadSuccess={atualizar} />
            </Secao>

            <Secao titulo="Documentos indexados">
              <DocumentList colecao="ctb" refreshTrigger={refreshTrigger} onChange={atualizar} />
            </Secao>
          </>
        )}

        {aba === 'pop' && (
          <>
            <Secao
              titulo="Enviar POPs"
              descricao="Procedimentos Operacionais Padrão da PMSC. A indexação corta por seção (finalidade, sequência das ações…) e guarda a página de cada trecho."
            >
              <AdminUploadForm colecao="pop" onUploadSuccess={atualizar} />
            </Secao>

            <Secao titulo="POPs indexados">
              <DocumentList colecao="pop" refreshTrigger={refreshTrigger} onChange={atualizar} />
              <Link href="/pop" className="btn-ghost btn-sm mt-4">
                Testar a consulta aos POPs
                <Icone nome="seta" tamanho={16} />
              </Link>
            </Secao>
          </>
        )}

        {aba === 'enquadramentos' && <AdminEnquadramentos />}
        {aba === 'provedores' && <AdminProvedores />}
        {aba === 'uso' && <AdminUso />}
        {aba === 'limites' && <AdminLimites />}
      </div>
    </main>
  );
}
