'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminUploadForm from '@/components/AdminUploadForm';
import DocumentList from '@/components/DocumentList';

/**
 * Admin dashboard page
 * Displays document overview, upload form, and document management interface
 */

interface DashboardStats {
  totalDocuments: number;
  byType: Record<string, number>;
  lastUpdated: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      router.push('/admin/login');
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CTB Agente</h1>
            <p className="text-gray-600 text-sm mt-1">Admin Panel</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total Documents</p>
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

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload New Document</h2>
          <AdminUploadForm onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Documents</h2>
          <DocumentList refreshTrigger={refreshTrigger} />
        </div>
      </main>
    </div>
  );
}
