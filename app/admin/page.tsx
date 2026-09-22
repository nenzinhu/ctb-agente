'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminUploadForm from '@/components/AdminUploadForm';
import DocumentList from '@/components/DocumentList';
import AdminEnquadramentos from '@/components/admin/AdminEnquadramentos';
import AdminProvedores from '@/components/admin/AdminProvedores';
import AdminUso from '@/components/admin/AdminUso';
import AdminLimites from '@/components/admin/AdminLimites';

/**
 * Master dashboard: documents, enforcement codes, AI providers, usage and limits
 */

interface DashboardStats {
  totalDocuments: number;
  byType: Record<string, number>;
  lastUpdated: string | null;
}

type Aba = 'documentos' | 'enquadramentos' | 'provedores' | 'uso' | 'limites';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'documentos', label: '📄 Documentos' },
  { id: 'enquadramentos', label: '🧾 Enquadramentos' },
  { id: 'provedores', label: '🤖 Provedores de IA' },
  { id: 'uso', label: '📈 Uso' },
  { id: 'limites', label: '🛡️ Limites' },
];

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
          const data = await response.json();
          setStats(data);
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

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Painel Master</h1>
            <p className="text-gray-600 text-sm mt-1">
              CTB Agente · base legal, provedores de IA e limites
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
          >
            Sair
          </button>
        </div>

        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Seções do painel">
          <ul className="flex flex-wrap gap-1">
            {ABAS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setAba(item.id)}
                  aria-current={aba === item.id ? 'page' : undefined}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
                    aba === item.id
                      ? 'border-ctb-green text-ctb-green'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total de documentos</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{stats.totalDocuments}</p>
            </div>

            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-medium capitalize">{type}</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{count}</p>
              </div>
            ))}
          </div>
        )}

        {aba === 'documentos' && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload de documento</h2>
              <AdminUploadForm onUploadSuccess={handleUploadSuccess} />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Documentos</h2>
              <DocumentList refreshTrigger={refreshTrigger} />
            </div>
          </>
        )}

        {aba === 'enquadramentos' && <AdminEnquadramentos />}
        {aba === 'provedores' && <AdminProvedores />}
        {aba === 'uso' && <AdminUso />}
        {aba === 'limites' && <AdminLimites />}
      </main>
    </div>
  );
}
